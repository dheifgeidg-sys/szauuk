// db.js — SQLite для истории цен, watchlist и залётных лотов
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id TEXT NOT NULL,
        region TEXT NOT NULL,
        price INTEGER NOT NULL,
        recorded_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ph ON price_history(item_id, region, recorded_at);

    CREATE TABLE IF NOT EXISTS watchlist (
        item_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        region TEXT DEFAULT 'ru',
        added_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bargains (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id TEXT NOT NULL,
        name TEXT,
        region TEXT NOT NULL,
        price INTEGER NOT NULL,
        avg_price INTEGER NOT NULL,
        discount_percent REAL NOT NULL,
        found_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_bargains ON bargains(found_at DESC);
`);

function addPrice(itemId, region, price) {
    db.prepare(`INSERT INTO price_history (item_id, region, price, recorded_at) VALUES (?, ?, ?, ?)`)
      .run(itemId, region, price, Date.now());
}

function getPriceHistory(itemId, region, hours = 168) {
    const since = Date.now() - hours * 3600 * 1000;
    return db.prepare(`
        SELECT price, recorded_at as time FROM price_history
        WHERE item_id = ? AND region = ? AND recorded_at >= ?
        ORDER BY recorded_at ASC
    `).all(itemId, region, since);
}

function getAveragePrice(itemId, region, hours = 24) {
    const since = Date.now() - hours * 3600 * 1000;
    return db.prepare(`
        SELECT AVG(price) as avg_price, COUNT(*) as cnt FROM price_history
        WHERE item_id = ? AND region = ? AND recorded_at >= ?
    `).get(itemId, region, since);
}

function getWatchlist() {
    return db.prepare(`SELECT * FROM watchlist ORDER BY added_at DESC`).all();
}

function addToWatchlist(itemId, name, category, region = 'ru') {
    db.prepare(`INSERT OR REPLACE INTO watchlist (item_id, name, category, region, added_at) VALUES (?, ?, ?, ?, ?)`)
      .run(itemId, name, category, region, Date.now());
}

function removeFromWatchlist(itemId) {
    db.prepare(`DELETE FROM watchlist WHERE item_id = ?`).run(itemId);
}

function addBargain(itemId, name, region, price, avgPrice, discount) {
    db.prepare(`
        INSERT INTO bargains (item_id, name, region, price, avg_price, discount_percent, found_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(itemId, name, region, price, avgPrice, discount, Date.now());
}

function getRecentBargains(hours = 48) {
    const since = Date.now() - hours * 3600 * 1000;
    return db.prepare(`SELECT * FROM bargains WHERE found_at >= ? ORDER BY found_at DESC LIMIT 100`).all(since);
}

function getLastBargainTime(itemId, region) {
    const r = db.prepare(`SELECT MAX(found_at) as last FROM bargains WHERE item_id = ? AND region = ?`).get(itemId, region);
    return r?.last || 0;
}

function cleanupOldData(days = 30) {
    const cutoff = Date.now() - days * 86400 * 1000;
    db.prepare(`DELETE FROM price_history WHERE recorded_at < ?`).run(cutoff);
    db.prepare(`DELETE FROM bargains WHERE found_at < ?`).run(cutoff);
}

module.exports = {
    db, addPrice, getPriceHistory, getAveragePrice,
    getWatchlist, addToWatchlist, removeFromWatchlist,
    addBargain, getRecentBargains, getLastBargainTime, cleanupOldData
};