/**
 * WeChat CDN media upload/download.
 */
import crypto from 'node:crypto';
import { encryptAesEcb, decryptAesEcb, aesEcbPaddedSize, parseAesKey } from './crypto.js';

const DEFAULT_CDN_URL = 'https://novac2c.cdn.weixin.qq.com/c2c';
const UPLOAD_MAX_RETRIES = 3;

function buildCdnDownloadUrl(encryptedQueryParam, cdnBaseUrl) {
  return `${cdnBaseUrl}/download?encrypted_query_param=${encodeURIComponent(encryptedQueryParam)}`;
}

function buildCdnUploadUrl(cdnBaseUrl, uploadParam, filekey) {
  return `${cdnBaseUrl}/upload?encrypted_query_param=${encodeURIComponent(uploadParam)}&filekey=${encodeURIComponent(filekey)}`;
}

/**
 * Download and decrypt a CDN media file.
 * @param {string} encryptedQueryParam - from message media.encrypt_query_param
 * @param {string} aesKeyBase64 - from message media.aes_key (base64)
 * @param {string} [cdnBaseUrl]
 * @returns {Promise<Buffer>} decrypted file content
 */
export async function downloadMedia(encryptedQueryParam, aesKeyBase64, cdnBaseUrl = DEFAULT_CDN_URL) {
  const key = parseAesKey(aesKeyBase64);
  const url = buildCdnDownloadUrl(encryptedQueryParam, cdnBaseUrl);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CDN download failed: ${res.status}`);
  const encrypted = Buffer.from(await res.arrayBuffer());
  return decryptAesEcb(encrypted, key);
}

/** Download without decryption (for cases where aes_key is not available). */
export async function downloadMediaRaw(encryptedQueryParam, cdnBaseUrl = DEFAULT_CDN_URL) {
  const url = buildCdnDownloadUrl(encryptedQueryParam, cdnBaseUrl);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CDN download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Upload a buffer to WeChat CDN with AES-128-ECB encryption.
 * @param {Buffer} buf - plaintext file content
 * @param {string} uploadParam - from getUploadUrl response
 * @param {string} filekey
 * @param {Buffer} aeskey - 16-byte AES key
 * @param {string} [cdnBaseUrl]
 * @returns {Promise<string>} download encrypted_query_param
 */
export async function uploadToCdn(buf, uploadParam, filekey, aeskey, cdnBaseUrl = DEFAULT_CDN_URL) {
  const ciphertext = encryptAesEcb(buf, aeskey);
  const url = buildCdnUploadUrl(cdnBaseUrl, uploadParam, filekey);

  let downloadParam;
  let lastError;

  for (let attempt = 1; attempt <= UPLOAD_MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: new Uint8Array(ciphertext),
      });
      if (res.status >= 400 && res.status < 500) {
        throw new Error(`CDN upload client error ${res.status}`);
      }
      if (res.status !== 200) {
        throw new Error(`CDN upload server error ${res.status}`);
      }
      downloadParam = res.headers.get('x-encrypted-param');
      if (!downloadParam) throw new Error('CDN response missing x-encrypted-param header');
      return downloadParam;
    } catch (err) {
      lastError = err;
      if (err.message.includes('client error')) throw err;
      // Backoff before retry
      if (attempt < UPLOAD_MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastError || new Error('CDN upload failed');
}

/**
 * High-level: prepare and upload a file to WeChat CDN.
 * Returns all info needed to construct a send message with media.
 */
export async function prepareUpload(api, buf, toUserId, mediaType = 1) {
  const rawsize = buf.length;
  const rawfilemd5 = crypto.createHash('md5').update(buf).digest('hex');
  const filesize = aesEcbPaddedSize(rawsize);
  const filekey = crypto.randomBytes(16).toString('hex');
  const aeskey = crypto.randomBytes(16);

  // Get upload URL from API
  const uploadResp = await api._getUploadUrl({
    filekey, media_type: mediaType, to_user_id: toUserId,
    rawsize, rawfilemd5, filesize,
    no_need_thumb: true, aeskey: aeskey.toString('hex'),
  });

  if (!uploadResp.upload_param) {
    throw new Error('getUploadUrl returned no upload_param');
  }

  // Upload to CDN
  const downloadParam = await uploadToCdn(buf, uploadResp.upload_param, filekey, aeskey, api.cdnUrl);

  return {
    filekey,
    downloadEncryptedQueryParam: downloadParam,
    aeskey: aeskey.toString('hex'),
    fileSize: rawsize,
    fileSizeCiphertext: filesize,
  };
}
