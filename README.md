<div align="center">

<img src="https://img.shields.io/badge/微信-07C160?style=for-the-badge&logo=wechat&logoColor=white" alt="WeChat" />
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
<img src="https://img.shields.io/badge/零依赖-brightgreen?style=for-the-badge" alt="Zero Dependencies" />

# 🤖 weixin-bot-sdk

### Node.js 微信机器人 SDK — 基于官方 iLink Bot API

**零依赖。完整 TypeScript 支持。收发图片/视频/文件/语音。**

[![npm version](https://img.shields.io/npm/v/weixin-bot-sdk.svg?style=flat-square)](https://www.npmjs.com/package/weixin-bot-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg?style=flat-square)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg?style=flat-square)](#-typescript)

中文 · [English](./README.en.md) · [Wiki](https://github.com/abczsl520/weixin-bot-sdk/wiki) · [API 参考](https://github.com/abczsl520/weixin-bot-sdk/wiki/API-Reference)

</div>

---

## ⚠️ 兼容性说明

> **iOS**：支持微信 8.0.70 版本。更新到最新版后需**在后台关掉微信再重新打开**，才能正常对接 Bot。
>
> **安卓**：已支持！扫码提示更新微信，更新完重新扫码即可，可能有部分 Bug 建议自测（部分安卓首页看不到 Bot，需要搜索或者在功能页面显示）。

---

## 💡 这是什么

2026 年，微信悄悄上线了官方 Bot API（**iLink Bot**），但没有公开的 SDK。

唯一的使用方式是通过某个框架的插件。我们逆向分析了那个插件，提取出了一个干净的、零依赖的独立 SDK。

```js
import { WeixinBot } from 'weixin-bot-sdk';

const bot = new WeixinBot();

bot.on('message', async (msg) => {
  await bot.reply(msg, `你说的是: ${msg.text}`);
});

await bot.login({
  onQrCode: (url) => console.log('扫码:', url),
});

bot.start();
```

**6 行代码，一个微信机器人就跑起来了。**

---

## 🏆 为什么选这个

| | weixin-bot-sdk | wxhook / itchat | Wechaty | 公众号 API |
|---|:-:|:-:|:-:|:-:|
| **封号风险** | ✅ 无 | ❌ 高 | 🟡 看实现 | ✅ 无 |
| **依赖** | ✅ 零 | ❌ 很多 | ❌ 很重 | 🟡 少量 |
| **个人消息** | ✅ 支持 | ✅ 支持 | ✅ 支持 | ❌ 不支持 |
| **媒体（图/视频/文件）** | ✅ 完整 | ✅ 完整 | ✅ 完整 | ✅ 完整 |
| **TypeScript** | ✅ 内置 | ❌ 无 | ✅ 有 | 🟡 社区 |
| **需要微信 PC** | ✅ 不需要 | ❌ 需要 | 🟡 看实现 | ✅ 不需要 |
| **搭建时间** | ✅ 2 分钟 | ❌ 30+ 分钟 | 🟡 10 分钟 | ❌ 几天（审核） |
| **稳定性** | ✅ 官方 API | ❌ 经常挂 | 🟡 不一定 | ✅ 稳定 |
| **代码量** | ✅ ~700 行 | ❌ 几千行 | ❌ 巨大 | 🟡 中等 |

---

## ⚡ 快速开始

### 安装

```bash
npm install weixin-bot-sdk
```

### Echo Bot（5 分钟）

```js
import { WeixinBot } from 'weixin-bot-sdk';

const bot = new WeixinBot({
  credentialsPath: '.wx-credentials.json',
});

bot.on('message', async (msg) => {
  switch (msg.type) {
    case 'text':
      await bot.reply(msg, `收到: ${msg.text}`);
      break;
    case 'image':
      await bot.reply(msg, '好图！📸');
      break;
    case 'voice':
      await bot.reply(msg, `语音转文字: ${msg.text}`);
      break;
  }
});

await bot.login({
  onQrCode: (url) => console.log('📱 用微信扫码:', url),
});

bot.start();
```

### AI 聊天机器人（10 分钟）

```js
import { WeixinBot } from 'weixin-bot-sdk';

const bot = new WeixinBot();

bot.on('message', async (msg) => {
  if (msg.type !== 'text') return;

  // 显示"正在输入..."
  await bot.sendTyping(msg.from);

  // 调用任意 AI API
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

await bot.login({ onQrCode: (url) => console.log('扫码:', url) });
bot.start();
```

---

## 📸 媒体支持

收发图片、视频、文件、语音 — AES-128-ECB 加密自动处理。

```js
// 发图片
await bot.sendImage(userId, fs.readFileSync('photo.jpg'));

// 发视频
await bot.sendVideo(userId, fs.readFileSync('clip.mp4'));

// 发文件
await bot.sendFile(userId, fs.readFileSync('doc.pdf'), 'report.pdf');

// 下载收到的媒体
bot.on('message', async (msg) => {
  if (msg.type === 'image') {
    const buf = await bot.downloadImage(msg.image);
    fs.writeFileSync('received.jpg', buf);
  }
});
```

---

## 🏗️ 架构

```
┌─────────────┐     扫码登录      ┌──────────────────────┐
│             │ ◄──────────────► │  iLink Bot API       │
│  你的代码    │                  │  ilinkai.weixin.qq.com│
│      +      │ ◄── long-poll ── │  (腾讯官方)           │
│  WeixinBot  │ ── sendMessage ─►│                      │
│             │                  └──────────────────────┘
└──────┬──────┘
       │ 上传/下载（AES-128-ECB 加密）
       ▼
┌──────────────────────────────┐
│  微信 CDN                    │
│  novac2c.cdn.weixin.qq.com  │
└──────────────────────────────┘
```

**iLink Bot API 工作流程：**

1. `GET /get_bot_qrcode` → 获取二维码
2. `GET /get_qrcode_status` → Long-poll 等用户扫码（返回 `bot_token`）
3. `POST /getupdates` → Long-poll 获取新消息（游标分页）
4. `POST /sendmessage` → 发送回复（带 `context_token`）
5. `POST /getuploadurl` → 获取 CDN 上传地址
6. 媒体用 AES-128-ECB 加密，密钥在 `aes_key` 字段

---

## 📖 API 速览

### WeixinBot（高层封装）

```js
const bot = new WeixinBot({ credentialsPath: '.wx-credentials.json' });

// 登录
await bot.login({ onQrCode, onStatus, timeoutMs, maxQrRefresh });

// 发消息
await bot.reply(msg, text);
await bot.sendText(userId, text, contextToken);
await bot.sendImage(userId, buffer);
await bot.sendVideo(userId, buffer);
await bot.sendFile(userId, buffer, filename);
await bot.sendTyping(userId);

// 下载媒体
const buf = await bot.downloadImage(imageItem);
const buf = await bot.downloadVoice(voiceItem);
const buf = await bot.downloadFile(fileItem);
const buf = await bot.downloadVideo(videoItem);

// 事件
bot.on('message', (parsed, raw) => { });
bot.on('login', (result) => { });
bot.on('error', (err) => { });
bot.on('session:expired', () => { });

// 生命周期
bot.start();
bot.stop();
```

### WeixinBotApi（底层 API）

```js
import { WeixinBotApi } from 'weixin-bot-sdk';

const api = new WeixinBotApi({ token });
const updates = await api.getUpdates(buf);
await api.sendText(userId, text, contextToken);
```

### 加密工具

```js
import { encryptAesEcb, decryptAesEcb, parseAesKey } from 'weixin-bot-sdk';

const key = parseAesKey(aesKeyBase64);
const encrypted = encryptAesEcb(key, plainBuffer);
const decrypted = decryptAesEcb(key, encryptedBuffer);
```

> 完整 API 文档：[Wiki → API Reference](https://github.com/abczsl520/weixin-bot-sdk/wiki/API-Reference)

---

## 📝 TypeScript

完整类型声明，开箱即用。

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

## 📂 项目结构

```
src/
  index.js    — 入口，导出所有模块
  bot.js      — WeixinBot 高层类（事件驱动）
  api.js      — WeixinBotApi HTTP 客户端
  cdn.js      — CDN 媒体上传/下载 + AES 加密
  crypto.js   — AES-128-ECB 工具函数
types/
  index.d.ts  — 完整 TypeScript 类型声明
examples/
  echo-bot.js       — 回声机器人
  low-level-api.js  — 直接使用底层 API
  ai-chatbot.js     — AI 聊天机器人（OpenAI）
```

---

## 📚 示例

| 示例 | 说明 |
|------|------|
| [echo-bot.js](./examples/echo-bot.js) | 回声机器人 — 原样返回你发的消息 |
| [low-level-api.js](./examples/low-level-api.js) | 不用 WeixinBot 封装，直接调 API |
| [ai-chatbot.js](./examples/ai-chatbot.js) | AI 聊天机器人（OpenAI/Claude） |

---

## ⚠️ 重要说明

- 使用微信官方 **iLink Bot API** — 不是 hook，不是注入
- Bot 只能收到用户**主动发给它**的消息
- Bot **不能**监听所有聊天或冒充个人号
- Token 可能过期，SDK 会在登录时自动刷新二维码（最多 3 次）
- **零封号风险** — 这是腾讯的正规 Bot 平台
- **支持 iOS 微信 8.0.70 + 安卓**（安卓扫码后按提示更新微信即可，可能有部分 Bug）

---

## 🔗 相关项目

| 项目 | 说明 |
|------|------|
| [weixin-bot](https://github.com/abczsl520/weixin-bot) | 一键 CLI — `npx weixin-bot` 即可启动 AI 聊天机器人 |
| [Wiki](https://github.com/abczsl520/weixin-bot-sdk/wiki) | 完整文档、教程、架构详解 |

---

## 贡献

欢迎贡献！请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

---

## License

MIT © 2026

<div align="center">

**⭐ 觉得有用？给个 Star 吧！**

**首个基于微信官方 Bot API 的独立 SDK。**

</div>
