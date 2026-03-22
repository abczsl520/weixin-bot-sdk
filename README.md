<div align="center">

# 🤖 weixin-bot-sdk

**The missing WeChat Bot SDK for Node.js**

Build WeChat bots in minutes. No WeChat PC client needed. No protocol hacking.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](#typescript)

[English](#features) · [中文文档](./README.zh-CN.md)

</div>

---

## Why This Exists

WeChat has quietly launched an official Bot API called **iLink Bot** — but there's no standalone SDK for it. The only way to use it was through a specific framework plugin.

We reverse-engineered that plugin and extracted a clean, zero-dependency SDK that anyone can use.

```js
import { WeixinBot } from 'weixin-bot-sdk';

const bot = new WeixinBot();

bot.on('message', async (msg) => {
  await bot.reply(msg, `You said: ${msg.text}`);
});

await bot.login({
  onQrCode: (url) => console.log('Scan this:', url),
});

bot.start();
```

**That's it.** No binary dependencies. No protocol reverse-engineering. No risk of account bans.

## Features

- 🔐 **Official API** — Uses WeChat's iLink Bot API, not protocol hacking
- 📦 **Zero dependencies** — Pure Node.js, nothing to install
- 🔄 **Real-time messaging** — Long-poll message loop (like Telegram Bot API)
- 📸 **Rich media** — Send & receive images, videos, files, and voice messages
- 🔑 **Auto credentials** — Login once, token persists automatically
- 💬 **Typing indicators** — Show "typing..." status to users
- 🎯 **Event-driven** — Simple `bot.on('message', ...)` pattern
- 📝 **TypeScript ready** — Full type declarations included
- ⚡ **Lightweight** — ~700 lines of code, ~25KB total

## Quick Start

### 1. Install

```bash
# From npm (coming soon)
npm install weixin-bot-sdk

# Or clone directly
git clone https://github.com/abczsl520/weixin-bot-sdk.git
cd weixin-bot-sdk
```

### 2. Create Your Bot

```js
import { WeixinBot } from 'weixin-bot-sdk';

const bot = new WeixinBot({
  credentialsPath: '.wx-credentials.json', // Auto-save login token
});

bot.on('message', async (msg) => {
  console.log(`[${msg.type}] ${msg.from}: ${msg.text}`);

  switch (msg.type) {
    case 'text':
      await bot.reply(msg, `Echo: ${msg.text}`);
      break;
    case 'image':
      await bot.reply(msg, 'Nice picture! 📸');
      break;
    case 'voice':
      await bot.reply(msg, `I heard: ${msg.text}`); // Auto voice-to-text
      break;
  }
});

// First run: scan QR code with WeChat
// After that: auto-login with saved token
if (!bot.isLoggedIn) {
  await bot.login({
    onQrCode: (url) => console.log('📱 Scan with WeChat:', url),
    onStatus: (s) => { if (s === 'scaned') console.log('👀 Scanned! Confirm on phone...'); },
  });
}

bot.start();
console.log('🤖 Bot is running!');
```

### 3. Run

```bash
node your-bot.js
```

Scan the QR code with WeChat, and your bot is live!

## API Reference

### WeixinBot

The high-level bot class. Handles login, message loop, and media.

#### Constructor

```js
const bot = new WeixinBot({
  credentialsPath: '.wx-credentials.json', // Optional: persist login token
  baseUrl: 'https://ilinkai.weixin.qq.com', // Optional: API base URL
  cdnUrl: 'https://novac2c.cdn.weixin.qq.com/c2c', // Optional: CDN URL
});
```

#### Login

```js
const result = await bot.login({
  onQrCode: (url) => { /* display QR code URL */ },
  onStatus: (status) => { /* 'wait' | 'scaned' | 'confirmed' | 'expired' */ },
  timeoutMs: 300000,    // Login timeout (default: 5 min)
  maxQrRefresh: 3,      // Auto-refresh expired QR codes
});
// result: { botToken, botId, baseUrl, userId }
```

#### Sending Messages

```js
// Reply to a received message
await bot.reply(msg, 'Hello!');

// Send to a specific user
await bot.sendText(userId, 'Hello!');
await bot.sendText(userId, 'Hello!', contextToken); // With explicit context

// Send media
await bot.sendImage(userId, imageBuffer);
await bot.sendImage(userId, imageBuffer, null, 'Check this out!'); // With caption
await bot.sendVideo(userId, videoBuffer);
await bot.sendFile(userId, fileBuffer, 'document.pdf');
```

#### Receiving Media

```js
bot.on('message', async (msg) => {
  if (msg.type === 'image') {
    const buf = await bot.downloadImage(msg.image);
    fs.writeFileSync('received.jpg', buf);
  }
  if (msg.type === 'voice') {
    const buf = await bot.downloadVoice(msg.voice);
    // buf is SILK format, may need transcoding
  }
  if (msg.type === 'file') {
    const buf = await bot.downloadFile(msg.file);
    fs.writeFileSync(msg.file.file_name, buf);
  }
  if (msg.type === 'video') {
    const buf = await bot.downloadVideo(msg.video);
    fs.writeFileSync('received.mp4', buf);
  }
});
```

#### Typing Indicators

```js
await bot.sendTyping(userId);    // Show "typing..."
await bot.cancelTyping(userId);  // Cancel typing
```

#### Events

| Event | Args | Description |
|-------|------|-------------|
| `message` | `(parsed, raw)` | New user message received |
| `login` | `(result)` | Login successful |
| `start` | — | Bot started polling |
| `stop` | — | Bot stopped |
| `error` | `(err)` | Error occurred |
| `session:expired` | — | Token expired, re-login needed |
| `poll` | `(response)` | Each getUpdates response |

#### Message Object

```js
{
  messageId: 123,
  from: 'user_ilink_id',
  to: 'bot_ilink_id',
  timestamp: 1711100000000,
  contextToken: '...',
  text: 'Hello',
  type: 'text',        // 'text' | 'image' | 'voice' | 'file' | 'video'
  image: { ... },       // Present when type='image'
  voice: { ... },       // Present when type='voice'
  file: { ... },        // Present when type='file'
  video: { ... },       // Present when type='video'
  quotedMessage: { ... }, // Present when replying to a message
  raw: { ... },         // Original WeixinMessage
}
```

### WeixinBotApi

Low-level API client for direct HTTP calls. Use when you need fine-grained control.

```js
import { WeixinBotApi } from 'weixin-bot-sdk';

const api = new WeixinBotApi({ token: 'your-bot-token' });

// Direct API calls
const updates = await api.getUpdates(buf);
await api.sendText(userId, 'Hello', contextToken);
await api.sendMessage(userId, itemList, contextToken);
const config = await api.getConfig(userId);
```

## How It Works

```
┌─────────────┐     QR Scan      ┌──────────────────────┐
│  Your Code  │ ◄──────────────► │  iLink Bot API       │
│             │                  │  ilinkai.weixin.qq.com│
│  WeixinBot  │ ◄── long-poll ── │                      │
│             │ ── sendMessage ─►│                      │
└──────┬──────┘                  └──────────────────────┘
       │
       │ upload/download
       ▼
┌──────────────────────────────┐
│  WeChat CDN                  │
│  novac2c.cdn.weixin.qq.com  │
│  (AES-128-ECB encrypted)    │
└──────────────────────────────┘
```

1. **Login**: Get QR code → User scans with WeChat → Receive `bot_token`
2. **Receive**: Long-poll `getUpdates` endpoint (server holds connection until new messages)
3. **Send**: POST to `sendMessage` with `context_token` from received message
4. **Media**: Files encrypted with AES-128-ECB, uploaded/downloaded via CDN

## Comparison

| Feature | weixin-bot-sdk | wxhook / itchat | Official MP API |
|---------|:-:|:-:|:-:|
| Account ban risk | ✅ None | ❌ High | ✅ None |
| Setup complexity | ✅ npm install | ❌ Binary injection | 🟡 App review |
| Personal messages | ✅ Yes | ✅ Yes | ❌ No |
| Group messages | ❌ Bot only | ✅ Yes | ✅ Yes |
| Media support | ✅ Full | ✅ Full | ✅ Full |
| Dependencies | ✅ Zero | ❌ Many | 🟡 Few |
| WeChat PC needed | ✅ No | ❌ Yes | ✅ No |
| Stability | ✅ Official API | ❌ Breaks often | ✅ Stable |

## TypeScript

Full type declarations are included. Works out of the box:

```ts
import { WeixinBot, ParsedMessage } from 'weixin-bot-sdk';

const bot = new WeixinBot();

bot.on('message', async (msg: ParsedMessage) => {
  if (msg.type === 'text') {
    await bot.reply(msg, msg.text.toUpperCase());
  }
});
```

## Examples

| Example | Description |
|---------|-------------|
| [echo-bot.js](./examples/echo-bot.js) | Simple echo bot — replies with what you send |
| [low-level-api.js](./examples/low-level-api.js) | Direct API usage without WeixinBot wrapper |
| [ai-chatbot.js](./examples/ai-chatbot.js) | AI chatbot powered by OpenAI/Claude |

## Important Notes

- This SDK uses WeChat's **iLink Bot API** — an official bot platform
- Bots can only receive messages that users **send directly to the bot**
- Bots **cannot** monitor all chats or act as a personal account
- Tokens may expire; the SDK handles auto-refresh of QR codes during login
- This is **not** a WeChat hook/injection tool — no risk of account bans

## Project Structure

```
src/
  index.js    Entry point, re-exports all modules
  bot.js      WeixinBot high-level class (event-driven)
  api.js      WeixinBotApi HTTP client
  cdn.js      CDN media upload/download + AES encryption
  crypto.js   AES-128-ECB utilities
types/
  index.d.ts  TypeScript declarations
examples/
  echo-bot.js       Echo bot example
  low-level-api.js  Direct API usage
  ai-chatbot.js     AI chatbot example
```

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

## License

MIT © 2025

---

<div align="center">

**If this project helped you, please consider giving it a ⭐**

Built by reverse-engineering `@tencent-weixin/openclaw-weixin` (MIT licensed).

</div>
