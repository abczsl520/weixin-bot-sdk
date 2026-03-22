/**
 * AI Chatbot 示例 - 接入 OpenAI / Claude 等大模型
 *
 * 用法:
 *   OPENAI_API_KEY=sk-xxx node examples/ai-chatbot.js
 *
 * 支持:
 *   - 文本对话（自动带上下文）
 *   - 语音消息（自动转文字后对话）
 *   - 图片消息（告知用户暂不支持）
 */
import { WeixinBot } from '../src/index.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.MODEL || 'gpt-4o-mini';

if (!OPENAI_API_KEY) {
  console.error('Please set OPENAI_API_KEY environment variable');
  process.exit(1);
}

// Simple conversation history (per user, last 20 messages)
const conversations = new Map();
const MAX_HISTORY = 20;

function getHistory(userId) {
  if (!conversations.has(userId)) {
    conversations.set(userId, []);
  }
  return conversations.get(userId);
}

function addMessage(userId, role, content) {
  const history = getHistory(userId);
  history.push({ role, content });
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
}

async function chat(userId, userMessage) {
  addMessage(userId, 'user', userMessage);

  const messages = [
    { role: 'system', content: 'You are a helpful WeChat bot assistant. Reply concisely in the same language the user uses.' },
    ...getHistory(userId),
  ];

  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: 1000 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content || '(no response)';
  addMessage(userId, 'assistant', reply);
  return reply;
}

// ── Bot Setup ──

const bot = new WeixinBot({
  credentialsPath: '.wx-credentials.json',
});

bot.on('message', async (msg) => {
  console.log(`[${msg.type}] ${msg.from}: ${msg.text}`);

  try {
    // Show typing indicator
    await bot.sendTyping(msg.from, msg.contextToken).catch(() => {});

    let reply;

    switch (msg.type) {
      case 'text':
        reply = await chat(msg.from, msg.text);
        break;

      case 'voice':
        if (msg.text) {
          // WeChat provides voice-to-text
          reply = await chat(msg.from, msg.text);
        } else {
          reply = '抱歉，无法识别语音内容，请发送文字消息~';
        }
        break;

      case 'image':
        reply = '收到图片！目前暂不支持图片理解，请发送文字消息~';
        break;

      default:
        reply = `收到${msg.type}消息，目前仅支持文字和语音对话~`;
    }

    await bot.reply(msg, reply);
    console.log(`  → ${reply.substring(0, 50)}...`);
  } catch (err) {
    console.error('Error:', err.message);
    await bot.reply(msg, '抱歉，处理消息时出错了，请稍后再试~').catch(() => {});
  }
});

bot.on('error', (err) => console.error('Bot error:', err.message));
bot.on('session:expired', () => console.log('⚠️ Session expired, restart to re-login'));

async function main() {
  if (bot.isLoggedIn) {
    console.log('Using saved credentials');
  } else {
    console.log('Scanning QR code to login...');
    await bot.login({
      onQrCode: (url) => {
        console.log('\n📱 Scan with WeChat:');
        console.log(url);
        console.log();
      },
      onStatus: (s) => {
        if (s === 'scaned') console.log('👀 Scanned! Confirm on phone...');
      },
    });
    console.log('✅ Login successful!');
  }

  bot.start();
  console.log(`🤖 AI Chatbot running (model: ${MODEL}). Press Ctrl+C to stop.`);
}

main().catch(console.error);
