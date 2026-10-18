const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const { SocksProxyAgent } = require('socks-proxy-agent');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// THAY LINK NGROK TỪ MÁY NHÀ VÀO ĐÂY (Ví dụ: https://xxxx.ngrok-free.app)
const LOCAL_WORKER_URL = 'https://THAY_LINK_NGROK_CỦA_BẠN';

// NẾU MUỐN THỬ PROXY TRÊN RENDER THÌ SỬA IP TẠI ĐÂY
const PROXY_IP = 'socks5://210.211.113.33:1080';

client.once('ready', () => {
  console.log(`[Bot Online] Đã đăng nhập thành công: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // LỆNH 1: !screenshot <link> -> Gửi yêu cầu về máy nhà mở trình duyệt chụp ảnh trang web
  if (message.content.startsWith('!screenshot')) {
    const args = message.content.split(' ');
    const url = args[1];

    if (!url) {
      return message.reply('❌ Vui lòng nhập link! Cú pháp: `!screenshot <link_layma>`');
    }

    const waitingMsg = await message.reply('📸 Đang gửi yêu cầu về Local Worker (mạng nhà) mở trình duyệt chụp ảnh...');

    try {
      const response = await fetch(`${LOCAL_WORKER_URL}/screenshot-local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (data.success) {
        const base64Data = data.image.replace(/^data:image\/png;base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        const attachment = new AttachmentBuilder(buffer, { name: 'screenshot.png' });

        await message.channel.send({
          content: `✅ **Hình ảnh thực tế giao diện trang web tại máy nhà:**`,
          files: [attachment]
        });
        await waitingMsg.delete().catch(() => {});
      } else {
        await waitingMsg.edit(`❌ **Chụp ảnh thất bại:** ${data.message}`);
      }
    } catch (error) {
      console.error(error);
      await waitingMsg.edit('❌ **Lỗi:** Không thể kết nối tới máy nhà! Vui lòng kiểm tra lại ngrok và `server.js`.');
    }
  }

  // LỆNH 2: !bypass <link> -> Tự động chạy F12/Userscript và lấy mã code
  if (message.content.startsWith('!bypass')) {
    const args = message.content.split(' ');
    const url = args[1];

    if (!url || !url.includes('layma.net')) {
      return message.reply('❌ Vui lòng nhập đúng link layma.net! Ví dụ: `!bypass https://layma.net/xxx`');
    }

    const waitingMsg = await message.reply('⏳ Đang xử lý tự động bypass qua Local Worker...');

    try {
      // Đẩy việc xử lý F12 / Userscript về máy nhà (Dùng Puppeteer + IP mạng nhà)
      const response = await fetch(`${LOCAL_WORKER_URL}/bypass-local`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      const data = await response.json();

      if (data.success) {
        await waitingMsg.edit(`✅ **Bypass thành công!**\n🔑 **Mã thu được:** \`${data.code}\``);
      } else {
        await waitingMsg.edit(`❌ **Bypass thất bại:** ${data.message}`);
      }
    } catch (error) {
      console.error(error);
      await waitingMsg.edit('❌ **Lỗi:** Không kết nối được với Local Worker máy nhà!');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
