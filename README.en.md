<div align="center">

<img src="https://img.shields.io/badge/WeChat-07C160?style=for-the-badge&logo=wechat&logoColor=white" alt="WeChat" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
<img src="https://img.shields.io/badge/Zero_Deps-brightgreen?style=for-the-badge" alt="Zero Dependencies" />

# 🤖 weixin-bot-sdk

### The missing WeChat Bot SDK for Node.js

**Official iLink Bot API. Zero dependencies. Full TypeScript. Media support.**

[![npm version](https://img.shields.io/npm/v/weixin-bot-sdk.svg?style=flat-square)](https://www.npmjs.com/package/weixin-bot-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=flat-square)](#-typescript)

[中文](./README.md) · English · [Wiki](https://github.com/abczsl520/weixin-bot-sdk/wiki) · [API Reference](https://github.com/abczsl520/weixin-bot-sdk/wiki/API-Reference)

</div>

---

## ⚠️ Compatibility

> **iOS**: Supports WeChat 8.0.70. After updating to the latest version, you must **force-quit WeChat from the background and reopen it** before the bot can connect.
>
> **Android**: Now supported! After generating the QR code with the SDK or Bot, scanning it will prompt a WeChat update. Download the update and scan again. Android may have some bugs — please test first.

---

## 💡 Why This Exists

In 2026, WeChat quietly launched an **official Bot API** — but with no public SDK.

The only way to use it was through a framework plugin buried in npm. We reverse-engineered it and extracted a clean, standalone SDK.

```js
import { WeixinBot } from 'weixin-bot-sdk';

const bot = new WeixinBot();

bot.on('message', async (msg) => {
  await bot.reply(msg, `You said: ${msg.text}`);
});

await bot.login({
  onQrCode: (url) => console.log('Scan:', url),
});

bot.start();
```

**6 lines. That's a working WeChat bot.**

---

## 🏆 Why Choose This Over Alternatives

| | weixin-bot-sdk | wxhook / itchat | Wechaty | Official MP API |
|---|:-:|:-:|:-:|:-:|
| **Ban risk** | ✅ Zero | ❌ High | 🟡 Depends | ✅ Zero |
| **Dependencies** | ✅ 0 | ❌ Many | ❌ Heavy | 🟡 Few |
| **Personal messages** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **Media (img/video/file)** | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **TypeScript** | ✅ Built-in | ❌ No | ✅ Yes | 🟡 Community |
| **WeChat PC needed** | ✅ No | ❌ Yes | 🟡 Depends | ✅ No |
| **Setup time** | ✅ 2 min | ❌ 30+ min | 🟡 10 min | ❌ Days (review) |
| **Stability** | ✅ Official API | ❌ Breaks often | 🟡 Varies | ✅ Stable |
| **Code size** | ✅ ~700 lines | ❌ Thousands | ❌ Massive | 🟡 Medium |

---

## ⚡ Quick Start

### Install

```bash
npm install weixin-bot-sdk
```

### Echo Bot (5 minutes)

```js
import { WeixinBot } from 'weixin-bot-sdk';

const bot = new WeixinBot({
  credentialsPath: '.wx-credentials.json',
});

bot.on('message', async (msg) => {
  switch (msg.type) {
    case 'text':
      await bot.reply(msg, `Echo: ${msg.text}`);
      break;
    case 'image':
      await bot.reply(msg, 'Nice picture! 📸');
      break;
    case 'voice':
      await bot.reply(msg, `I heard: ${msg.text}`);
      break;
  }
});

await bot.login({
  onQrCode: (url) => console.log('📱 Scan with WeChat:', url),
});

bot.start();
```

### AI Chatbot (10 minutes)

```js
import { WeixinBot } from 'weixin-bot-sdk';

const bot = new WeixinBot();

bot.on('message', async (msg) => {
  if (msg.type !== 'text') return;

  await bot.sendTyping(msg.from);

  const reply = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: msg.text }],
    }),
  }).then(r => r.json());

  await bot.reply(msg, reply.choices[0].message.content);
});

await bot.login({ onQrCode: (url) => console.log('Scan:', url) });
bot.start();
```

---

## 📸 Media Support

Send and receive images, videos, files, and voice messages — AES-128-ECB encryption handled automatically.

```js
await bot.sendImage(userId, fs.readFileSync('photo.jpg'));
await bot.sendVideo(userId, fs.readFileSync('clip.mp4'));
await bot.sendFile(userId, fs.readFileSync('doc.pdf'), 'report.pdf');

bot.on('message', async (msg) => {
  if (msg.type === 'image') {
    const buf = await bot.downloadImage(msg.image);
    fs.writeFileSync('received.jpg', buf);
  }
});
```

---

## 🏗️ Architecture

```
┌─────────────┐     QR Login      ┌──────────────────────┐
│             │ ◄────────────────► │  iLink Bot API       │
│  Your Code  │                    │  ilinkai.weixin.qq.com│
│      +      │ ◄── long-poll ──── │  (Tencent Official)  │
│  WeixinBot  │ ── sendMessage ──► │                      │
│             │                    └──────────────────────┘
└──────┬──────┘
       │ upload / download (AES-128-ECB)
       ▼
┌──────────────────────────────┐
│  WeChat CDN                  │
│  novac2c.cdn.weixin.qq.com  │
└──────────────────────────────┘
```

---

## 📖 API at a Glance

### WeixinBot (High-Level)

```js
const bot = new WeixinBot({ credentialsPath: '.wx-credentials.json' });

await bot.login({ onQrCode, onStatus, timeoutMs, maxQrRefresh });

await bot.reply(msg, text);
await bot.sendText(userId, text, contextToken);
await bot.sendImage(userId, buffer);
await bot.sendVideo(userId, buffer);
await bot.sendFile(userId, buffer, filename);
await bot.sendTyping(userId);

const buf = await bot.downloadImage(imageItem);

bot.on('message', (parsed, raw) => { });
bot.on('login', (result) => { });
bot.on('error', (err) => { });
bot.on('session:expired', () => { });

bot.start();
bot.stop();
```

### WeixinBotApi (Low-Level)

```js
import { WeixinBotApi } from 'weixin-bot-sdk';
const api = new WeixinBotApi({ token });
const updates = await api.getUpdates(buf);
await api.sendText(userId, text, contextToken);
```

> Full API docs: [Wiki → API Reference](https://github.com/abczsl520/weixin-bot-sdk/wiki/API-Reference)

---

## 📝 TypeScript

Full type declarations included. Zero config needed.

```ts
import { WeixinBot, ParsedMessage } from 'weixin-bot-sdk';

const bot = new WeixinBot();
bot.on('message', async (msg: ParsedMessage) => {
  if (msg.type === 'text') {
    await bot.reply(msg, msg.text.toUpperCase());
  }
});
```

---

## ⚠️ Important Notes

- Uses WeChat's **official iLink Bot API** — not a hook, not a hack
- Bots can only receive messages users **send directly to the bot**
- Bots **cannot** monitor all chats or act as a personal account
- **Zero ban risk** — legitimate bot platform by Tencent
- **Currently supports iOS WeChat 8.0.70 only**, Android now supported (may have bugs)

---

## 🔗 Related

| Project | Description |
|---------|-------------|
| [weixin-bot](https://github.com/abczsl520/weixin-bot) | One-command CLI — `npx weixin-bot` for instant AI chatbot |
| [Wiki](https://github.com/abczsl520/weixin-bot-sdk/wiki) | Full documentation, tutorials, architecture deep-dive |

---

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

---

## License

MIT © 2026

<div align="center">

**⭐ Star if this helped you build something cool!**

**The first standalone SDK for WeChat's official Bot API.**

</div>
