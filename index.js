const { Client, GatewayIntentBits } = require('discord.js');
const { SocksProxyAgent } = require('socks-proxy-agent');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// 📌 GÁN IP PROXY SOCKS5 CỦA MÀY VÀO ĐÂY
const PROXY_URL = 'socks5://210.211.113.33:1080';

client.once('ready', () => {
  console.log(`[Bot Online] Đã kết nối Discord: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // LỆNH 1: !xem <link> -> Dùng proxy kéo nội dung về rồi "in" chữ trực tiếp lên chat Discord
  if (message.content.startsWith('!xem')) {
    const args = message.content.split(' ');
    const url = args[1];

    if (!url) {
      return message.reply('❌ Nhập link cần xem! Cú pháp: `!xem <link_layma>`');
    }

    const waitingMsg = await message.reply(`🔍 Đang dùng Proxy kết nối và đọc nội dung trang...`);

    try {
      const agent = new SocksProxyAgent(PROXY_URL);

      const response = await fetch(url, {
        method: 'GET',
        agent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(15000)
      });

      const htmlText = await response.text();

      // Kiểm tra nếu bị Cloudflare tóm
      if (response.status === 403 || htmlText.includes('cf-mitigation') || htmlText.includes('Attention Required!')) {
        return await waitingMsg.edit(`❌ **Bị Cloudflare chặn!** (Status: 403). Con proxy này đã tạch.`);
      }

      // Lọc lấy một đoạn text ngắn gọn từ HTML (khoảng 1500 ký tự đầu tiên để không bị quá giới hạn của Discord)
      // Loại bỏ bớt các thẻ rườm rà nếu cần, hoặc in thẳng đoạn chữ đầu tiên
      const cleanText = htmlText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
      const snippet = cleanText.substring(0, 1500); // Lấy 1500 ký tự đầu

      await waitingMsg.edit(`📄 **Nội dung trang web thu được qua Proxy** (Status: \`${response.status}\`):\n\`\`\`text\n${snippet}\n\`\`\``);

    } catch (error) {
      console.error(error);
      await waitingMsg.edit(`❌ **Lỗi:** Proxy ngỏm hoặc kết nối bị timeout.`);
    }
  }

  // LỆNH 2: !bypass <link> -> Thử tìm mã code nhanh và in thẳng ra màn hình
  if (message.content.startsWith('!bypass')) {
    const args = message.content.split(' ');
    const url = args[1];

    if (!url || !url.includes('layma.net')) {
      return message.reply('❌ Nhập đúng link layma.net! Cú pháp: `!bypass <link>`');
    }

    const waitingMsg = await message.reply(`⏳ Đang bypass qua Proxy...`);

    try {
      const agent = new SocksProxyAgent(PROXY_URL);
      const response = await fetch(url, {
        method: 'GET',
        agent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(15000)
      });

      const htmlText = await response.text();

      if (response.status === 403 || htmlText.includes('cf-mitigation') || htmlText.includes('Attention Required!')) {
        return await waitingMsg.edit(`❌ **Bị chặn:** Cloudflare tóm cổ con proxy này rồi!`);
      }

      // Tìm kiếm các từ khóa chứa mã code
      const codeMatch = htmlText.match(/(?:code|pass|key|mã)[:=]\s*["']?([a-zA-Z0-9_-]{4,20})["']?/i);

      if (codeMatch && codeMatch[1]) {
        await waitingMsg.edit(`✅ **Thành công!**\n🔑 **Mã in ra màn hình:** \`${codeMatch[1]}\``);
      } else {
        await waitingMsg.edit(`⚠️ Đã vào được trang (Status ${response.status}) nhưng chưa tìm thấy mã tự động. Hãy dùng lệnh \`!xem <link>\` để in toàn bộ chữ trên trang ra đọc nhé!`);
      }

    } catch (error) {
      console.error(error);
      await waitingMsg.edit(`❌ **Lỗi:** Không kết nối được qua proxy.`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
