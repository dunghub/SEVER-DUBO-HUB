const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready', () => {
  console.log(`Bot đã online thành công với tên: ${client.user.tag}`);
});

// Xử lý tin nhắn gửi vào Discord
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Lệnh kiểm tra bot: !ping
  if (message.content === '!ping') {
    return message.reply('Pong! Bot Bypass Layma.net đang hoạt động bình thường.');
  }

  // Lệnh Bypass Layma.net: !bypass <link>
  if (message.content.startsWith('!bypass')) {
    const args = message.content.split(' ');
    const url = args[1];

    if (!url) {
      return message.reply('Vui lòng nhập link layma.net cần bypass! Ví dụ: `!bypass https://layma.net/example`');
    }

    if (!url.includes('layma.net')) {
      return message.reply('Link không hợp lệ! Vui lòng nhập đúng link của `layma.net`.');
    }

    const waitingMsg = await message.reply('⏳ Đang tiến hành lấy mã từ `layma.net`, vui lòng chờ giây lát...');

    try {
      // Gọi API bypass công khai của Layma.net
      const apiUrl = `https://layma.net/api?url=${encodeURIComponent(url)}`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data && (data.code || data.key || data.result)) {
        const resultCode = data.code || data.key || data.result;
        await waitingMsg.edit(`✅ **Bypass thành công!**\n🔑 **Mã của bạn:** \`${resultCode}\``);
      } else {
        await waitingMsg.edit('❌ **Bypass thất bại!** Không tìm thấy mã hoặc link đã hết hạn.');
      }
    } catch (error) {
      console.error(error);
      await waitingMsg.edit('❌ **Bypass thất bại!** Có lỗi xảy ra khi kết nối tới máy chủ layma.net.');
    }
  }
});

// Lấy Token bảo mật từ Environment Variables trên Render
client.login(process.env.DISCORD_TOKEN);
