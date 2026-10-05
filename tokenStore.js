// tokenStore.js — сохранение токена между перезапусками
const fs = require('fs');
const path = require('path');

const TOKEN_FILE = path.join(__dirname, '.token.json');

function saveToken(token) {
    try {
        fs.writeFileSync(TOKEN_FILE, JSON.stringify({
            token,
            saved_at: Date.now()
        }), 'utf-8');
        console.log('💾 Токен сохранён в .token.json');
    } catch (e) {
        console.error('❌ Не удалось сохранить токен:', e.message);
    }
}

function loadToken() {
    try {
        if (!fs.existsSync(TOKEN_FILE)) return null;
        const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
        // Токен Stalzone живёт ~1 час, но обновляется через refresh.
        // Пока просто проверяем, что он есть
        return data.token || null;
    } catch (e) {
        return null;
    }
}

function clearToken() {
    try { if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE); } catch (e) {}
}

module.exports = { saveToken, loadToken, clearToken };