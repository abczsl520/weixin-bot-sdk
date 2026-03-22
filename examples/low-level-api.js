/**
 * 低级 API 示例 - 直接使用 WeixinBotApi
 *
 * 展示不用 WeixinBot 高级封装，直接调 API 的方式。
 * 适合需要精细控制的场景。
 */
import { WeixinBotApi } from '../src/index.js';

const api = new WeixinBotApi();

async function main() {
  // 1. 扫码登录
  console.log('获取二维码...');
  const qr = await api.getQrCode();
  console.log('📱 请扫描:', qr.qrcode_img_content);

  // 2. 轮询等待确认
  let token;
  while (true) {
    const status = await api.pollQrStatus(qr.qrcode);
    console.log('Status:', status.status);

    if (status.status === 'confirmed') {
      api.token = status.bot_token;
      if (status.baseurl) api.baseUrl = status.baseurl;
      token = status.bot_token;
      console.log('✅ 登录成功! Bot ID:', status.ilink_bot_id);
      break;
    }
    if (status.status === 'expired') {
      console.log('❌ 二维码过期');
      return;
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  // 3. 收消息循环
  let updatesBuf = '';
  console.log('\n等待消息...');

  while (true) {
    const resp = await api.getUpdates(updatesBuf);
    if (resp.get_updates_buf) updatesBuf = resp.get_updates_buf;

    if (resp.errcode === -14) {
      console.log('Session expired');
      break;
    }

    for (const msg of (resp.msgs || [])) {
      if (msg.message_type !== 1) continue; // Only user messages

      const text = msg.item_list?.[0]?.text_item?.text;
      if (text) {
        console.log(`收到: ${text} (from: ${msg.from_user_id})`);

        // 回复
        await api.sendText(msg.from_user_id, `Echo: ${text}`, msg.context_token);
        console.log('  → 已回复');
      }
    }
  }
}

main().catch(console.error);
