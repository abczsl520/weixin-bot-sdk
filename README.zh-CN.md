<div align="center">

# 🤖 weixin-bot-sdk

**Node.js 微信机器人 SDK — 基于官方 iLink Bot API**

几分钟搭建微信机器人。不需要微信PC客户端。不需要协议逆向。零依赖。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](#typescript)

[English](./README.md) · 中文文档

</div>

---

## 这是什么

微信悄悄上线了官方 Bot API（**iLink Bot**），但没有独立的 SDK。唯一的使用方式是通过特定框架的插件。

我们逆向分析了那个插件，提取出了一个干净的、零依赖的 SDK，任何人都能直接用。

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

**就这么简单。** 没有二进制依赖，没有协议逆向，没有封号风险。

## 特性

- 🔐 **官方 API** — 使用微信 iLink Bot API，不是协议破解
- 📦 **零依赖** — 纯 Node.js，不需要安装任何东西
- 🔄 **实时消息** — Long-poll 消息循环（类似 Telegram Bot API）
- 📸 **富媒体** — 收发图片、视频、文件、语音
- 🔑 **自动登录** — 扫码一次，Token 自动持久化
- 💬 **输入状态** — 显示"正在输入..."
- 🎯 **事件驱动** — 简单的 `bot.on('message', ...)` 模式
- 📝 **TypeScript** — 完整类型声明
- ⚡ **轻量** — ~700 行代码，~25KB

## 快速开始

### 1. 安装

```bash
npm install weixin-bot-sdk

# 或直接克隆
git clone https://github.com/abczsl520/weixin-bot-sdk.git
```

### 2. 写机器人

```js
import { WeixinBot } from 'weixin-bot-sdk';

const bot = new WeixinBot({
  credentialsPath: '.wx-credentials.json',
});

bot.on('message', async (msg) => {
  console.log(`[${msg.type}] ${msg.from}: ${msg.text}`);

  if (msg.type === 'text') {
    await bot.reply(msg, `收到: ${msg.text}`);
  } else if (msg.type === 'image') {
    await bot.reply(msg, '好图！📸');
  } else if (msg.type === 'voice') {
    await bot.reply(msg, `语音转文字: ${msg.text}`);
  }
});

if (!bot.isLoggedIn) {
  await bot.login({
    onQrCode: (url) => console.log('📱 用微信扫码:', url),
  });
}

bot.start();
```

### 3. 运行

```bash
node your-bot.js
```

用微信扫码，机器人就上线了！

## 对比

| 特性 | weixin-bot-sdk | wxhook / itchat | 公众号 API |
|------|:-:|:-:|:-:|
| 封号风险 | ✅ 无 | ❌ 高 | ✅ 无 |
| 搭建难度 | ✅ npm install | ❌ 注入二进制 | 🟡 需审核 |
| 个人消息 | ✅ 支持 | ✅ 支持 | ❌ 不支持 |
| 群消息 | ❌ 仅 Bot | ✅ 支持 | ✅ 支持 |
| 媒体支持 | ✅ 完整 | ✅ 完整 | ✅ 完整 |
| 依赖 | ✅ 零 | ❌ 很多 | 🟡 少量 |
| 需要微信PC | ✅ 不需要 | ❌ 需要 | ✅ 不需要 |
| 稳定性 | ✅ 官方API | ❌ 经常挂 | ✅ 稳定 |

## 工作原理

```
┌─────────────┐     扫码登录      ┌──────────────────────┐
│  你的代码    │ ◄──────────────► │  iLink Bot API       │
│             │                  │  ilinkai.weixin.qq.com│
│  WeixinBot  │ ◄── long-poll ── │                      │
│             │ ── sendMessage ─►│                      │
└──────┬──────┘                  └──────────────────────┘
       │
       │ 上传/下载（AES-128-ECB 加密）
       ▼
┌──────────────────────────────┐
│  微信 CDN                    │
│  novac2c.cdn.weixin.qq.com  │
└──────────────────────────────┘
```

## 注意事项

- 这是微信官方 **iLink Bot API**，不是 hook/注入
- Bot 只能收到用户**主动发给它**的消息
- Bot **不能**监听所有聊天或冒充个人号
- Token 可能过期，SDK 会在登录时自动刷新二维码（最多3次）
- **没有封号风险**

## 协议

MIT © 2025

---

<div align="center">

**觉得有用？给个 ⭐ 吧！**

</div>
