/**
 * Echo Bot 示例 - 收到消息原样回复
 *
 * 用法: node examples/echo-bot.js
 *
 * 首次运行会弹出二维码链接，用微信扫码登录。
 * 登录凭证会保存到 .wx-credentials.json，下次自动复用。
 */
import { WeixinBot } from '../src/index.js';

const bot = new WeixinBot({
  credentialsPath: '.wx-credentials.json',
});

bot.on('message', async (msg) => {
  console.log(`[${msg.type}] ${msg.from}: ${msg.text}`);

  if (msg.type === 'text' && msg.text) {
    // Echo back
    await bot.reply(msg, `你说的是: ${msg.text}`);
    console.log(`  → 已回复`);
  }

  if (msg.type === 'image') {
    await bot.reply(msg, '收到图片~');
  }

  if (msg.type === 'voice') {
    const text = msg.text || '(语音无法识别)';
    await bot.reply(msg, `语音转文字: ${text}`);
  }
});

bot.on('error', (err) => {
  console.error('Bot error:', err.message);
});

bot.on('session:expired', () => {
  console.log('Session expired, need to re-login');
});

// Login and start
async function main() {
  if (bot.isLoggedIn) {
    console.log('Using saved credentials');
  } else {
    console.log('Scanning QR code to login...');
    await bot.login({
      onQrCode: (url) => {
        console.log('\n📱 请用微信扫描二维码:');
        console.log(url);
        console.log();
      },
      onStatus: (status) => {
        if (status === 'scaned') console.log('👀 已扫码，请在微信确认...');
      },
    });
    console.log('✅ 登录成功!');
  }

  bot.start();
  console.log('🤖 Echo bot is running. Press Ctrl+C to stop.');
}

main().catch(console.error);
