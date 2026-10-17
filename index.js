const { Client, GatewayIntentBits } = require('discord.js');
const { SocksProxyAgent } = require('socks-proxy-agent'); // Thư viện kéo proxy SOCKS5

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready', () => {
  console.log(`Bot đã online: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!bypass')) {
    const args = message.content.split(' ');
    const url = args[1];

    if (!url || !url.includes('layma.net')) {
      return message.reply('Vui lòng nhập đúng link layma.net! Ví dụ: `!bypass https://layma.net/xxx`');
    }

    const waitingMsg = await message.reply('⏳ Đang thử nghiệm kết nối qua Proxy VN (`157.66.26.151`)...');

    try {
      // Khởi tạo Agent chạy qua Proxy SOCKS5 miễn phí
      const proxyUrl = 'socks5://192.168.1.27';
      const agent = new SocksProxyAgent(proxyUrl);

      // Gọi fetch kèm agent proxy
      const response = await fetch(url, {
        method: 'GET',
        agent: agent, // Ép request đi qua proxy
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(10000) // Timeout sau 10 giây nếu proxy ngỏm
      });

      const htmlText = await response.text();

      // Kiểm tra xem có bị Cloudflare chặn (403, Cloudflare Challenge) hay không
      if (htmlText.includes('cf-mitigation') || htmlText.includes('Attention Required!') || response.status === 403) {
        return await waitingMsg.edit('❌ **Thất bại:** Proxy này đã bị Cloudflare tóm cổ hoặc ngỏm từ trước!');
      }

      // Quét tìm mã code sơ bộ trong HTML trả về
      const codeMatch = htmlText.match(/(?:code|pass|key|mã)[:=]\s*["']?([a-zA-Z0-9_-]{4,20})["']?/i);

      if (codeMatch && codeMatch[1]) {
        await waitingMsg.edit(`✅ **Bypass thành công qua Proxy!**\n🔑 **Mã:** \`${codeMatch[1]}\``);
      } else {
        await waitingMsg.edit(`⚠️ Proxy sống và kết nối được tới trang, nhưng trang yêu cầu chạy script/nhiệm vụ (cần F12). Phản hồi HTTP: ${response.status}`);
      }

    } catch (error) {
      console.error(error);
      await waitingMsg.edit(`❌ **Proxy tèo:** Không thể kết nối tới proxy \`157.66.26.151:1080\` (Có thể proxy đã chết hoặc quá tải).`);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
