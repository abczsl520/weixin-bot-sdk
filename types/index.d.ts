/**
 * weixin-bot-sdk - TypeScript type declarations
 */

import { EventEmitter } from 'node:events';

// ── Constants ──

export declare const MessageType: {
  readonly NONE: 0;
  readonly USER: 1;
  readonly BOT: 2;
};

export declare const MessageItemType: {
  readonly NONE: 0;
  readonly TEXT: 1;
  readonly IMAGE: 2;
  readonly VOICE: 3;
  readonly FILE: 4;
  readonly VIDEO: 5;
};

export declare const MessageState: {
  readonly NEW: 0;
  readonly GENERATING: 1;
  readonly FINISH: 2;
};

export declare const UploadMediaType: {
  readonly IMAGE: 1;
  readonly VIDEO: 2;
  readonly FILE: 3;
  readonly VOICE: 4;
};

// ── API Types ──

export interface CDNMedia {
  encrypt_query_param?: string;
  aes_key?: string;
  encrypt_type?: number;
}

export interface ImageItem {
  media?: CDNMedia;
  thumb_media?: CDNMedia;
  aeskey?: string;
  url?: string;
  mid_size?: number;
  thumb_size?: number;
  thumb_height?: number;
  thumb_width?: number;
  hd_size?: number;
}

export interface VoiceItem {
  media?: CDNMedia;
  encode_type?: number;
  bits_per_sample?: number;
  sample_rate?: number;
  playtime?: number;
  text?: string;
}

export interface FileItem {
  media?: CDNMedia;
  file_name?: string;
  md5?: string;
  len?: string;
}

export interface VideoItem {
  media?: CDNMedia;
  video_size?: number;
  play_length?: number;
  video_md5?: string;
  thumb_media?: CDNMedia;
  thumb_size?: number;
  thumb_height?: number;
  thumb_width?: number;
}

export interface MessageItem {
  type?: number;
  create_time_ms?: number;
  update_time_ms?: number;
  is_completed?: boolean;
  msg_id?: string;
  ref_msg?: { message_item?: MessageItem; title?: string };
  text_item?: { text?: string };
  image_item?: ImageItem;
  voice_item?: VoiceItem;
  file_item?: FileItem;
  video_item?: VideoItem;
}

export interface WeixinMessage {
  seq?: number;
  message_id?: number;
  from_user_id?: string;
  to_user_id?: string;
  client_id?: string;
  create_time_ms?: number;
  update_time_ms?: number;
  delete_time_ms?: number;
  session_id?: string;
  group_id?: string;
  message_type?: number;
  message_state?: number;
  item_list?: MessageItem[];
  context_token?: string;
}

export interface GetUpdatesResponse {
  ret?: number;
  errcode?: number;
  errmsg?: string;
  msgs?: WeixinMessage[];
  get_updates_buf?: string;
  longpolling_timeout_ms?: number;
}

export interface GetConfigResponse {
  ret?: number;
  errmsg?: string;
  typing_ticket?: string;
}

export interface LoginResult {
  botToken: string;
  botId: string;
  baseUrl?: string;
  userId?: string;
}

export interface QrCodeResponse {
  qrcode: string;
  qrcode_img_content: string;
}

export interface QrStatusResponse {
  status: 'wait' | 'scaned' | 'confirmed' | 'expired';
  bot_token?: string;
  ilink_bot_id?: string;
  baseurl?: string;
  ilink_user_id?: string;
}

export interface UploadedFileInfo {
  filekey: string;
  downloadEncryptedQueryParam: string;
  aeskey: string;
  fileSize: number;
  fileSizeCiphertext: number;
}

// ── Parsed Message ──

export interface ParsedMessage {
  messageId?: number;
  from: string;
  to: string;
  timestamp?: number;
  contextToken?: string;
  text: string;
  type: 'text' | 'image' | 'voice' | 'file' | 'video';
  image?: ImageItem;
  voice?: VoiceItem;
  file?: FileItem;
  video?: VideoItem;
  quotedMessage?: { title?: string; item?: MessageItem };
  raw: WeixinMessage;
}

// ── WeixinBotApi ──

export interface WeixinBotApiOptions {
  baseUrl?: string;
  cdnUrl?: string;
  token?: string;
  version?: string;
}

export interface LoginOptions {
  onQrCode?: (qrcodeUrl: string) => void;
  onStatus?: (status: string) => void;
  botType?: string;
  timeoutMs?: number;
  maxQrRefresh?: number;
}

export declare class WeixinBotApi {
  baseUrl: string;
  cdnUrl: string;
  token: string | null;
  version: string;

  constructor(options?: WeixinBotApiOptions);

  getQrCode(botType?: string): Promise<QrCodeResponse>;
  pollQrStatus(qrcode: string): Promise<QrStatusResponse>;
  login(options?: LoginOptions): Promise<LoginResult>;
  getUpdates(getUpdatesBuf?: string): Promise<GetUpdatesResponse>;
  sendMessage(toUserId: string, itemList: MessageItem[], contextToken: string): Promise<string>;
  sendText(toUserId: string, text: string, contextToken: string): Promise<string>;
  sendTyping(ilinkUserId: string, typingTicket: string, status?: number): Promise<void>;
  getConfig(ilinkUserId: string, contextToken?: string): Promise<GetConfigResponse>;
}

// ── WeixinBot ──

export interface WeixinBotOptions extends WeixinBotApiOptions {
  credentialsPath?: string;
}

export interface WeixinBotEvents {
  message: [parsed: ParsedMessage, raw: WeixinMessage];
  login: [result: LoginResult];
  start: [];
  stop: [];
  error: [error: Error];
  'session:expired': [];
  'credentials:loaded': [credentials: Record<string, unknown>];
  poll: [response: GetUpdatesResponse];
}

export declare class WeixinBot extends EventEmitter {
  api: WeixinBotApi;
  isLoggedIn: boolean;

  constructor(options?: WeixinBotOptions);

  login(options?: LoginOptions): Promise<LoginResult>;
  start(): void;
  stop(): void;

  reply(msg: ParsedMessage, text: string): Promise<string>;
  sendText(toUserId: string, text: string, contextToken?: string): Promise<string>;
  sendImage(toUserId: string, imageBuf: Buffer, contextToken?: string, caption?: string): Promise<void>;
  sendVideo(toUserId: string, videoBuf: Buffer, contextToken?: string, caption?: string): Promise<void>;
  sendFile(toUserId: string, fileBuf: Buffer, fileName: string, contextToken?: string, caption?: string): Promise<void>;

  downloadImage(imageItem: ImageItem, cdnBaseUrl?: string): Promise<Buffer>;
  downloadVoice(voiceItem: VoiceItem, cdnBaseUrl?: string): Promise<Buffer>;
  downloadFile(fileItem: FileItem, cdnBaseUrl?: string): Promise<Buffer>;
  downloadVideo(videoItem: VideoItem, cdnBaseUrl?: string): Promise<Buffer>;

  sendTyping(userId: string, contextToken?: string): Promise<void>;
  cancelTyping(userId: string, contextToken?: string): Promise<void>;

  on<K extends keyof WeixinBotEvents>(event: K, listener: (...args: WeixinBotEvents[K]) => void): this;
  emit<K extends keyof WeixinBotEvents>(event: K, ...args: WeixinBotEvents[K]): boolean;
}

// ── CDN utilities ──

export declare function downloadMedia(encryptedQueryParam: string, aesKeyBase64: string, cdnBaseUrl?: string): Promise<Buffer>;
export declare function downloadMediaRaw(encryptedQueryParam: string, cdnBaseUrl?: string): Promise<Buffer>;
export declare function uploadToCdn(buf: Buffer, uploadParam: string, filekey: string, aeskey: Buffer, cdnBaseUrl?: string): Promise<string>;
export declare function prepareUpload(api: WeixinBotApi, buf: Buffer, toUserId: string, mediaType?: number): Promise<UploadedFileInfo>;

// ── Crypto utilities ──

export declare function encryptAesEcb(plaintext: Buffer, key: Buffer): Buffer;
export declare function decryptAesEcb(ciphertext: Buffer, key: Buffer): Buffer;
export declare function aesEcbPaddedSize(plaintextSize: number): number;
export declare function parseAesKey(aesKeyBase64: string): Buffer;
