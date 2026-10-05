// bot.js — для новой версии node-telegram-bot-api (с классом Bot)
const { Bot, Api } = require('node-telegram-bot-api');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let api = null;

function initBot() {
    if (!TOKEN || !CHAT_ID) {
        console.log('⚠️ Telegram не настроен — пропускаю');
        return null;
    }
    try {
        // В новой версии основной клиент — Api
        api = new Api(TOKEN);
        console.log('✅ Telegram API инициализирован');
        return api;
    } catch (e) {
        console.error('❌ Ошибка Telegram:', e.message);
        api = null;
        return null;
    }
}

async function sendMessage(text) {
    if (!api) return false;
    try {
        await api.sendMessage({
            chat_id: CHAT_ID,
            text,
            parse_mode: 'HTML'
        });
        return true;
    } catch (e) {
        console.error('❌ Ошибка отправки:', e.message);
        return false;
    }
}

async function sendBargainAlert(item, b) {
    const text = `🎯 <b>ЗАЛЁТНЫЙ ЛОТ!</b>\n\n📦 <b>${item.name}</b>\n🆔 <code>${item.itemId}</code>\n🌍 Регион: <b>${b.region.toUpperCase()}</b>\n\n💰 Цена: <b>${b.price.toLocaleString('ru-RU')} ₽</b>\n📊 Средняя (24ч): ${b.avgPrice.toLocaleString('ru-RU')} ₽\n📉 Скидка: <b>${b.discount}%</b>`;
    return sendMessage(text);
}

module.exports = { initBot, sendMessage, sendBargainAlert };