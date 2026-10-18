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

// 📌 THAY IP PROXY CỦA BẠN VÀO ĐÂY (Dạng: socks5://IP:PORT)
const PROXY_URL = 'socks5://210.211.113.33:1080';

client.once('ready', () => {
  console.log(`[Bot Online] Đã kết nối Discord: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!bypass')) {
    const args = message.content.split(' ');
    const url = args[1];

    if (!url || !url.includes('layma.net')) {
      return message.reply('❌ Nhập đúng link layma.net! Cú pháp: `!bypass https://layma.net/xxx`');
    }

    const waitingMsg = await message.reply(`⏳ Đang gửi request qua Proxy (\`${PROXY_URL}\`)...`);

    try {
      // Khởi tạo agent kết nối qua proxy SOCKS5
      const agent = new SocksProxyAgent(PROXY_URL);

      // Gửi request tới layma.net chui qua Proxy
      const response = await fetch(url, {
        method: 'GET',
        agent: agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        signal: AbortSignal.timeout(15000) // Timeout sau 15 giây nếu proxy chậm/chết
      });

      const htmlText = await response.text();

      // Kiểm tra xem Proxy có bị Cloudflare chặn không (trả về 403 hoặc trang Challenge)
      if (response.status === 403 || htmlText.includes('cf-mitigation') || htmlText.includes('Attention Required!')) {
        return await waitingMsg.edit(`❌ **Proxy bị Cloudflare chặn!** (Status: ${response.status}). Vui lòng đổi IP Proxy khác.`);
      }

      // Tìm mã code sơ bộ trong HTML trả về
      const codeMatch = htmlText.match(/(?:code|pass|key|mã)[:=]\s*["']?([a-zA-Z0-9_-]{4,20})["']?/i);

      if (codeMatch && codeMatch[1]) {
        await waitingMsg.edit(`✅ **Bypass thành công qua Proxy!**\n🔑 **Mã thu được:** \`${codeMatch[1]}\``);
      } else {
        await waitingMsg.edit(`⚠️ **Đã vào được trang qua Proxy** (HTTP Status: ${response.status}), nhưng trang yêu cầu chạy JavaScript/F12 để sinh ra mã nên fetch chay không tự lấy được.`);
      }

    } catch (error) {
      console.error(error);
      await waitingMsg.edit(`❌ **Lỗi Proxy:** Không thể kết nối tới Proxy \`${PROXY_URL}\` (Proxy đã chết, quỵt kết nối hoặc bị timeout).`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
