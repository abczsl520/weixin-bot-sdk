/**
 * WeChat iLink Bot - high-level bot class with event-driven message loop.
 *
 * Usage:
 *   const bot = new WeixinBot();
 *   bot.on('message', (msg) => { ... });
 *   await bot.login({ onQrCode: (url) => console.log('Scan:', url) });
 *   bot.start();
 */
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import { WeixinBotApi } from './api.js';
import { downloadMedia, prepareUpload } from './cdn.js';

// Message type constants
export const MessageType = { NONE: 0, USER: 1, BOT: 2 };
export const MessageItemType = { NONE: 0, TEXT: 1, IMAGE: 2, VOICE: 3, FILE: 4, VIDEO: 5 };
export const MessageState = { NEW: 0, GENERATING: 1, FINISH: 2 };
export const UploadMediaType = { IMAGE: 1, VIDEO: 2, FILE: 3, VOICE: 4 };

export class WeixinBot extends EventEmitter {
  constructor(options = {}) {
    super();
    this.api = new WeixinBotApi(options);
    this._running = false;
    this._updatesBuf = '';
    this._contextTokens = new Map(); // userId -> contextToken
    this._credentials = null;
    this._credentialsPath = options.credentialsPath || null;

    // Try to load saved credentials
    if (this._credentialsPath) {
      this._loadCredentials();
    }
  }

  // ── Credentials persistence ──

  _loadCredentials() {
    try {
      if (fs.existsSync(this._credentialsPath)) {
        const data = JSON.parse(fs.readFileSync(this._credentialsPath, 'utf-8'));
        if (data.botToken) {
          this.api.token = data.botToken;
          if (data.baseUrl) this.api.baseUrl = data.baseUrl;
          this._credentials = data;
          this.emit('credentials:loaded', data);
        }
      }
    } catch { /* ignore */ }
  }

  _saveCredentials(creds) {
    this._credentials = creds;
    if (this._credentialsPath) {
      try {
        fs.writeFileSync(this._credentialsPath, JSON.stringify(creds, null, 2));
        fs.chmodSync(this._credentialsPath, 0o600);
      } catch { /* ignore */ }
    }
  }

  get isLoggedIn() {
    return !!this.api.token;
  }

  // ── Auth ──

  async login(options = {}) {
    const result = await this.api.login(options);
    this._saveCredentials({
      botToken: result.botToken,
      botId: result.botId,
      baseUrl: result.baseUrl,
      userId: result.userId,
      savedAt: new Date().toISOString(),
    });
    this.emit('login', result);
    return result;
  }

  // ── Message loop ──

  start() {
    if (this._running) return;
    if (!this.api.token) throw new Error('Not logged in. Call login() first.');
    this._running = true;
    this.emit('start');
    this._pollLoop();
  }

  stop() {
    this._running = false;
    this.emit('stop');
  }

  async _pollLoop() {
    let errorBackoff = 3000;
    const MAX_BACKOFF = 60000;

    while (this._running) {
      try {
        const resp = await this.api.getUpdates(this._updatesBuf);

        if (resp.get_updates_buf) {
          this._updatesBuf = resp.get_updates_buf;
        }

        // Session expired
        if (resp.errcode === -14 || resp.errcode === -13) {
          this.emit('session:expired', resp.errcode);
          this.stop();
          return;
        }

        // Reset backoff on success
        errorBackoff = 3000;

        if (resp.msgs?.length) {
          for (const msg of resp.msgs) {
            // Only process user messages (not our own bot messages)
            if (msg.message_type !== MessageType.USER) continue;

            // Cache context_token for replies (limit cache size)
            if (msg.context_token && msg.from_user_id) {
              this._contextTokens.set(msg.from_user_id, msg.context_token);
              // Evict oldest entries if cache grows too large
              if (this._contextTokens.size > 1000) {
                const first = this._contextTokens.keys().next().value;
                this._contextTokens.delete(first);
              }
            }

            // Parse message content
            const parsed = this._parseMessage(msg);
            this.emit('message', parsed, msg);
          }
        }

        this.emit('poll', resp);
      } catch (err) {
        this.emit('error', err);
        // Exponential backoff on error
        await new Promise(r => setTimeout(r, errorBackoff));
        errorBackoff = Math.min(errorBackoff * 2, MAX_BACKOFF);
      }
    }
  }

  _parseMessage(msg) {
    const result = {
      messageId: msg.message_id,
      from: msg.from_user_id,
      to: msg.to_user_id,
      timestamp: msg.create_time_ms,
      contextToken: msg.context_token,
      text: '',
      type: 'text',
      raw: msg,
    };

    if (!msg.item_list?.length) return result;

    // First pass: extract text (always present as separate item or in voice)
    for (const item of msg.item_list) {
      if (item.type === MessageItemType.TEXT && item.text_item?.text != null) {
        result.text = String(item.text_item.text);
        if (item.ref_msg) {
          result.quotedMessage = {
            title: item.ref_msg.title,
            item: item.ref_msg.message_item,
          };
        }
      }
    }

    // Second pass: extract media (priority: image > video > file > voice)
    for (const item of msg.item_list) {
      if (item.type === MessageItemType.IMAGE) {
        result.type = 'image';
        result.image = item.image_item;
        break;
      }
      if (item.type === MessageItemType.VIDEO) {
        result.type = 'video';
        result.video = item.video_item;
        break;
      }
      if (item.type === MessageItemType.FILE) {
        result.type = 'file';
        result.file = item.file_item;
        break;
      }
      if (item.type === MessageItemType.VOICE) {
        result.type = 'voice';
        result.voice = item.voice_item;
        // Voice-to-text fallback
        if (!result.text && item.voice_item?.text) {
          result.text = item.voice_item.text;
        }
        break;
      }
    }

    return result;
  }

  // ── Send helpers ──

  _getContextToken(userId) {
    const token = this._contextTokens.get(userId);
    if (!token) throw new Error(`No context_token for user ${userId}. User must send a message first.`);
    return token;
  }

  async reply(msg, text) {
    return this.sendText(msg.from, text, msg.contextToken);
  }

  async sendText(toUserId, text, contextToken) {
    contextToken = contextToken || this._getContextToken(toUserId);
    return this.api.sendText(toUserId, text, contextToken);
  }

  async sendImage(toUserId, imageBuf, contextToken, caption = '') {
    contextToken = contextToken || this._getContextToken(toUserId);
    const uploaded = await prepareUpload(this.api, imageBuf, toUserId, UploadMediaType.IMAGE);

    const items = [];
    if (caption) items.push({ type: MessageItemType.TEXT, text_item: { text: caption } });
    items.push({
      type: MessageItemType.IMAGE,
      image_item: {
        media: {
          encrypt_query_param: uploaded.downloadEncryptedQueryParam,
          aes_key: Buffer.from(uploaded.aeskey, 'hex').toString('base64'),
          encrypt_type: 1,
        },
        mid_size: uploaded.fileSizeCiphertext,
      },
    });

    // Send each item separately (WeChat requires single-item sends)
    for (const item of items) {
      await this.api.sendMessage(toUserId, [item], contextToken);
    }
  }

  async sendVideo(toUserId, videoBuf, contextToken, caption = '') {
    contextToken = contextToken || this._getContextToken(toUserId);
    const uploaded = await prepareUpload(this.api, videoBuf, toUserId, UploadMediaType.VIDEO);

    const items = [];
    if (caption) items.push({ type: MessageItemType.TEXT, text_item: { text: caption } });
    items.push({
      type: MessageItemType.VIDEO,
      video_item: {
        media: {
          encrypt_query_param: uploaded.downloadEncryptedQueryParam,
          aes_key: Buffer.from(uploaded.aeskey, 'hex').toString('base64'),
          encrypt_type: 1,
        },
        video_size: uploaded.fileSizeCiphertext,
      },
    });

    for (const item of items) {
      await this.api.sendMessage(toUserId, [item], contextToken);
    }
  }

  async sendFile(toUserId, fileBuf, fileName, contextToken, caption = '') {
    contextToken = contextToken || this._getContextToken(toUserId);
    const uploaded = await prepareUpload(this.api, fileBuf, toUserId, UploadMediaType.FILE);

    const items = [];
    if (caption) items.push({ type: MessageItemType.TEXT, text_item: { text: caption } });
    items.push({
      type: MessageItemType.FILE,
      file_item: {
        media: {
          encrypt_query_param: uploaded.downloadEncryptedQueryParam,
          aes_key: Buffer.from(uploaded.aeskey, 'hex').toString('base64'),
          encrypt_type: 1,
        },
        file_name: fileName,
        len: String(uploaded.fileSize),
      },
    });

    for (const item of items) {
      await this.api.sendMessage(toUserId, [item], contextToken);
    }
  }

  // ── Media download ──

  async downloadImage(imageItem, cdnBaseUrl) {
    const media = imageItem.media;
    if (!media?.encrypt_query_param) throw new Error('No encrypt_query_param in image');
    if (!media.aes_key) throw new Error('No aes_key in image media');
    return downloadMedia(media.encrypt_query_param, media.aes_key, cdnBaseUrl || this.api.cdnUrl);
  }

  async downloadVoice(voiceItem, cdnBaseUrl) {
    const media = voiceItem.media;
    if (!media?.encrypt_query_param || !media.aes_key) throw new Error('Missing voice media info');
    return downloadMedia(media.encrypt_query_param, media.aes_key, cdnBaseUrl || this.api.cdnUrl);
  }

  async downloadFile(fileItem, cdnBaseUrl) {
    const media = fileItem.media;
    if (!media?.encrypt_query_param || !media.aes_key) throw new Error('Missing file media info');
    return downloadMedia(media.encrypt_query_param, media.aes_key, cdnBaseUrl || this.api.cdnUrl);
  }

  async downloadVideo(videoItem, cdnBaseUrl) {
    const media = videoItem.media;
    if (!media?.encrypt_query_param || !media.aes_key) throw new Error('Missing video media info');
    return downloadMedia(media.encrypt_query_param, media.aes_key, cdnBaseUrl || this.api.cdnUrl);
  }

  // ── Typing indicator ──

  async sendTyping(userId, contextToken) {
    contextToken = contextToken || this._getContextToken(userId);
    const config = await this.api.getConfig(userId, contextToken);
    if (config.typing_ticket) {
      await this.api.sendTyping(userId, config.typing_ticket, 1);
    }
  }

  async cancelTyping(userId, contextToken) {
    contextToken = contextToken || this._getContextToken(userId);
    const config = await this.api.getConfig(userId, contextToken);
    if (config.typing_ticket) {
      await this.api.sendTyping(userId, config.typing_ticket, 2);
    }
  }
}
