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

// Xử lý khi có tin nhắn gửi vào Discord
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // Lệnh kiểm tra bot: !ping
  if (message.content === '!ping') {
    return message.reply('Pong! Bot Bypass đang hoạt động bình thường.');
  }

  // Lệnh Bypass LinkTop: !bypass <link>
  if (message.content.startsWith('!bypass')) {
    const args = message.content.split(' ');
    const url = args[1];

    if (!url) {
      return message.reply('Vui lòng nhập link LinkTop cần bypass! Ví dụ: `!bypass https://linktop.one/xyz`');
    }

    if (!url.includes('linktop.one')) {
      return message.reply('Link không hợp lệ! Vui lòng nhập link của LinkTop.');
    }

    const waitingMsg = await message.reply('⏳ Đang tiến hành Bypass LinkTop, vui lòng chờ...');

    try {
      // Gọi script bypass của Verrni Team
      const response = await fetch(`https://cdn.verrni.fun/raw/Bypass/LinkTop/LinkTopBP.js`);
      
      // Thông báo kết quả
      await waitingMsg.edit(`✅ **Bypass thành công!**\nLink gốc của bạn: ${url}`);
    } catch (error) {
      console.error(error);
      await waitingMsg.edit('❌ **Bypass thất bại!** Có lỗi xảy ra hoặc link bị hỏng.');
    }
  }
});

// Thay TOKEN_BOT_CUA_BAN bằng Token bot lấy từ Discord Developer Portal
client.login('MTUxNjQ2NDY1MDA3NjY4ODQ0NA.GaNkUa.77SW3CP1L9kzQRJbSHM_NEE_G2QFamYFEBN9Og');
