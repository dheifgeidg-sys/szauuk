require('dotenv').config();
const bot = require('./bot');
bot.initBot();
setTimeout(async () => {
    const ok = await bot.sendMessage('🎯 <b>SZAUK</b>\n\nТестовое сообщение. Сканер работает!');
    console.log(ok ? '✅ Сообщение отправлено' : '❌ Не отправлено');
    process.exit(0);
}, 1000);