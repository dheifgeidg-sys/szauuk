// bot-menu.js — установка кнопки Mini App в боте
require('dotenv').config();
const TelegramBotModule = require('node-telegram-bot-api');
const TelegramBot = TelegramBotModule.TelegramBot || TelegramBotModule.default || TelegramBotModule;

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;

if (!TOKEN || !WEBAPP_URL) {
    console.error('❌ Нужны TELEGRAM_BOT_TOKEN и WEBAPP_URL в .env');
    process.exit(1);
}

console.log('🔧 URL Mini App:', WEBAPP_URL);
const bot = new TelegramBot(TOKEN, { polling: false });

(async () => {
    try {
        // Кнопка Mini App в меню бота
        await bot.setChatMenuButton({
            menu_button: {
                type: 'web_app',
                text: 'Открыть SZAUK',
                web_app: { url: WEBAPP_URL }
            }
        });
        console.log('✅ Кнопка меню установлена');

        // Команды
        await bot.setMyCommands([
            { command: 'start', description: 'Запустить бота' },
            { command: 'app', description: 'Открыть SZAUK' }
        ]);
        console.log('✅ Команды установлены');

        console.log('\n📱 Открой бота в Telegram и нажми ☰ → "Открыть SZAUK"');
        console.log('   Или отправь /app');
    } catch (e) {
        console.error('❌ Ошибка:', e.message);
    }
    process.exit(0);
})();
