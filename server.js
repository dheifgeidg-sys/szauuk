// server.js
const express = require('express');
const path = require('path');
const config = require('./config');
const { getAuthUrl, getAccessToken } = require('./auth');
const { getAllItems, getAllCategories, getAllRarities } = require('./itemLoader');
const { fetchRegions, fetchEmissionStatus, fetchItemHistory, fetchActiveLots, fetchCharacterProfile } = require('./api');
const db = require('./db');
const bot = require('./bot');
const scanner = require('./scanner');
const tokenStore = require('./tokenStore');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ АВТОРИЗАЦИЯ ============
app.get('/login', (req, res) => res.redirect(getAuthUrl()));

app.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('Нет кода');
    try {
        global.userAccessToken = await getAccessToken(code);
        tokenStore.saveToken(global.userAccessToken);
        console.log('✅ Токен получен и сохранён!');
        res.redirect('/');
    } catch (e) { res.status(500).send('Ошибка авторизации'); }
});

app.get('/api/auth/status', (req, res) => res.json({ authenticated: !!global.userAccessToken }));

// ============ ФИЛЬТРЫ ============
app.get('/api/items/filters', (req, res) => {
    res.json({ categories: getAllCategories(), rarities: getAllRarities() });
});

// ============ ПОИСК ПРЕДМЕТОВ ============
app.get('/api/items/search', (req, res) => {
    const { query = '', category = '', rarity = '', page = 1, limit = 50 } = req.query;
    let results = getAllItems();
    if (query) { const q = query.toLowerCase(); results = results.filter(i => i.name.toLowerCase().includes(q)); }
    if (category) results = results.filter(i => i.category === category);
    const isArt = category === 'artefact' || category === 'artifact';
    if (rarity && !isArt) results = results.filter(i => i.color === rarity);

    const total = results.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (Number(page) - 1) * Number(limit);
    res.json({ total, page: Number(page), totalPages, limit: Number(limit), items: results.slice(offset, offset + Number(limit)) });
});

// ============ WATCHLIST ============
app.get('/api/watchlist', (req, res) => {
    if (!global.userAccessToken) return res.status(401).json({ error: 'Not authenticated' });
    res.json(db.getWatchlist());
});

app.post('/api/watchlist', (req, res) => {
    if (!global.userAccessToken) return res.status(401).json({ error: 'Not authenticated' });
    const { id, name, category, region } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'Не хватает полей' });
    db.addToWatchlist(id, name, category, region || 'ru');
    res.json({ ok: true });
});

app.delete('/api/watchlist/:id', (req, res) => {
    if (!global.userAccessToken) return res.status(401).json({ error: 'Not authenticated' });
    db.removeFromWatchlist(req.params.id);
    res.json({ ok: true });
});

// ============ БАРГЕЙНЫ ============
app.get('/api/bargains', (req, res) => {
    if (!global.userAccessToken) return res.status(401).json({ error: 'Not authenticated' });
    const hours = parseInt(req.query.hours || '48');
    res.json(db.getRecentBargains(hours));
});

// ============ ИСТОРИЯ ЦЕН (из нашей БД) ============
app.get('/api/price-history', (req, res) => {
    if (!global.userAccessToken) return res.status(401).json({ error: 'Not authenticated' });
    const { item, region = 'ru', hours = 168 } = req.query;
    if (!item) return res.status(400).json({ error: 'Не указан item' });
    const history = db.getPriceHistory(item, region, parseInt(hours));
    const avg = db.getAveragePrice(item, region, 24);
    res.json({ history, avg24h: avg.avg_price || null, cnt24h: avg.cnt });
});

// ============ API STALZONE ============
app.get('/regions', async (req, res) => {
    if (!global.userAccessToken) return res.status(401).json({ error: 'Not authenticated' });
    try { res.json(await fetchRegions(global.userAccessToken)); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/auction/lots', async (req, res) => {
    if (!global.userAccessToken) return res.status(401).json({ error: 'Not authenticated' });
    const { region, item } = req.query;
    if (!region || !item) return res.status(400).json({ error: 'Нужны region и item' });
    try { res.json(await fetchActiveLots(global.userAccessToken, region, item, 200)); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/auction/history', async (req, res) => {
    if (!global.userAccessToken) return res.status(401).json({ error: 'Not authenticated' });
    const { region, item } = req.query;
    if (!region || !item) return res.status(400).json({ error: 'Нужны region и item' });
    try { res.json(await fetchItemHistory(global.userAccessToken, region, item)); } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============ ЗАПУСК ============
// Пытаемся восстановить токен из файла
const savedToken = tokenStore.loadToken();
if (savedToken) {
    global.userAccessToken = savedToken;
    console.log('🔑 Восстановлен сохранённый токен');
}

bot.initBot();
scanner.init(() => global.userAccessToken);
scanner.start();

app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🎯 SZAUK запущен: http://localhost:${PORT}`);
    console.log(`=========================================`);
});