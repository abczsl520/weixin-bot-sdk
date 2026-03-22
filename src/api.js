/**
 * WeChat iLink Bot API client.
 * Base URL: https://ilinkai.weixin.qq.com
 * CDN URL: https://novac2c.cdn.weixin.qq.com/c2c
 */
import crypto from 'node:crypto';

const DEFAULT_BASE_URL = 'https://ilinkai.weixin.qq.com';
const DEFAULT_CDN_URL = 'https://novac2c.cdn.weixin.qq.com/c2c';
const DEFAULT_LONG_POLL_TIMEOUT = 35000;
const DEFAULT_API_TIMEOUT = 15000;

function randomWechatUin() {
  const uint32 = crypto.randomBytes(4).readUInt32BE(0);
  return Buffer.from(String(uint32), 'utf-8').toString('base64');
}

function buildHeaders(token, body) {
  const headers = {
    'Content-Type': 'application/json',
    'AuthorizationType': 'ilink_bot_token',
    'Content-Length': String(Buffer.byteLength(body, 'utf-8')),
    'X-WECHAT-UIN': randomWechatUin(),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function apiFetch({ baseUrl, endpoint, body, token, timeoutMs, label }) {
  const url = new URL(endpoint, baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  const headers = buildHeaders(token, body);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      method: 'POST', headers, body, signal: controller.signal,
    });
    clearTimeout(timer);
    const text = await res.text();
    if (!res.ok) throw new Error(`${label} ${res.status}: ${text}`);
    return text;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export class WeixinBotApi {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.cdnUrl = options.cdnUrl || DEFAULT_CDN_URL;
    this.token = options.token || null;
    this.version = options.version || '1.0.0';
  }

  _baseInfo() {
    return { channel_version: this.version };
  }

  // ── Auth: QR Login ──

  async getQrCode(botType = '3') {
    const url = new URL(
      `ilink/bot/get_bot_qrcode?bot_type=${encodeURIComponent(botType)}`,
      this.baseUrl.endsWith('/') ? this.baseUrl : this.baseUrl + '/'
    );
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`getQrCode failed: ${res.status}`);
    return await res.json(); // { qrcode, qrcode_img_content }
  }

  async pollQrStatus(qrcode) {
    const url = new URL(
      `ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`,
      this.baseUrl.endsWith('/') ? this.baseUrl : this.baseUrl + '/'
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DEFAULT_LONG_POLL_TIMEOUT);
    try {
      const res = await fetch(url.toString(), {
        headers: { 'iLink-App-ClientVersion': '1' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`pollQrStatus failed: ${res.status}`);
      return await res.json(); // { status, bot_token, ilink_bot_id, baseurl, ilink_user_id }
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') return { status: 'wait' };
      throw err;
    }
  }

  /**
   * Full login flow: get QR → poll until confirmed → set token.
   * @param {Function} onQrCode - callback(qrcodeUrl) to display QR
   * @param {Function} [onStatus] - callback(status) for status updates
   * @returns {Promise<{botToken, botId, baseUrl, userId}>}
   */
  async login({ onQrCode, onStatus, botType = '3', timeoutMs = 300000, maxQrRefresh = 3 } = {}) {
    let qr = await this.getQrCode(botType);
    if (onQrCode) onQrCode(qr.qrcode_img_content);

    const deadline = Date.now() + timeoutMs;
    let refreshCount = 1;

    while (Date.now() < deadline) {
      const status = await this.pollQrStatus(qr.qrcode);
      if (onStatus) onStatus(status.status);

      if (status.status === 'confirmed') {
        this.token = status.bot_token;
        if (status.baseurl) this.baseUrl = status.baseurl;
        return {
          botToken: status.bot_token,
          botId: status.ilink_bot_id,
          baseUrl: status.baseurl,
          userId: status.ilink_user_id,
        };
      }
      if (status.status === 'expired') {
        refreshCount++;
        if (refreshCount > maxQrRefresh) {
          throw new Error(`QR code expired ${maxQrRefresh} times, giving up`);
        }
        // Auto-refresh QR code
        qr = await this.getQrCode(botType);
        if (onQrCode) onQrCode(qr.qrcode_img_content);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    throw new Error('Login timeout');
  }

  // ── Messages ──

  async getUpdates(getUpdatesBuf = '') {
    try {
      const raw = await apiFetch({
        baseUrl: this.baseUrl,
        endpoint: 'ilink/bot/getupdates',
        body: JSON.stringify({
          get_updates_buf: getUpdatesBuf,
          base_info: this._baseInfo(),
        }),
        token: this.token,
        timeoutMs: DEFAULT_LONG_POLL_TIMEOUT,
        label: 'getUpdates',
      });
      return JSON.parse(raw);
    } catch (err) {
      if (err.name === 'AbortError') {
        return { ret: 0, msgs: [], get_updates_buf: getUpdatesBuf };
      }
      throw err;
    }
  }

  async sendMessage(toUserId, itemList, contextToken) {
    const clientId = `wx-bot-${crypto.randomBytes(8).toString('hex')}`;
    await apiFetch({
      baseUrl: this.baseUrl,
      endpoint: 'ilink/bot/sendmessage',
      body: JSON.stringify({
        msg: {
          from_user_id: '',
          to_user_id: toUserId,
          client_id: clientId,
          message_type: 2, // BOT
          message_state: 2, // FINISH
          item_list: itemList,
          context_token: contextToken,
        },
        base_info: this._baseInfo(),
      }),
      token: this.token,
      timeoutMs: DEFAULT_API_TIMEOUT,
      label: 'sendMessage',
    });
    return clientId;
  }

  async sendText(toUserId, text, contextToken) {
    return this.sendMessage(toUserId, [
      { type: 1, text_item: { text } }
    ], contextToken);
  }

  async sendTyping(ilinkUserId, typingTicket, status = 1) {
    await apiFetch({
      baseUrl: this.baseUrl,
      endpoint: 'ilink/bot/sendtyping',
      body: JSON.stringify({
        ilink_user_id: ilinkUserId,
        typing_ticket: typingTicket,
        status,
        base_info: this._baseInfo(),
      }),
      token: this.token,
      timeoutMs: 10000,
      label: 'sendTyping',
    });
  }

  async _getUploadUrl(params) {
    const raw = await apiFetch({
      baseUrl: this.baseUrl,
      endpoint: 'ilink/bot/getuploadurl',
      body: JSON.stringify({ ...params, base_info: this._baseInfo() }),
      token: this.token,
      timeoutMs: DEFAULT_API_TIMEOUT,
      label: 'getUploadUrl',
    });
    return JSON.parse(raw);
  }

  async getConfig(ilinkUserId, contextToken) {
    const raw = await apiFetch({
      baseUrl: this.baseUrl,
      endpoint: 'ilink/bot/getconfig',
      body: JSON.stringify({
        ilink_user_id: ilinkUserId,
        context_token: contextToken,
        base_info: this._baseInfo(),
      }),
      token: this.token,
      timeoutMs: 10000,
      label: 'getConfig',
    });
    return JSON.parse(raw);
  }
}
