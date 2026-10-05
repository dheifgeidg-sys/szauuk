// itemLoader.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const INDEX_FILE = path.join(__dirname, 'items-index.json');

let ALL_ITEMS = [];
let isLoaded = false;

function walkDir(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const p = path.join(dir, file);
        if (fs.statSync(p).isDirectory()) walkDir(p, fileList);
        else if (file.endsWith('.json')) fileList.push(p);
    }
    return fileList;
}

function loadFromDataFolder() {
    const allFiles = walkDir(DATA_DIR);
    const items = [];
    for (const filePath of allFiles) {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            if (!data.id || !data.name) continue;
            let nameRu = data.id;
            if (data.name.type === 'translation' && data.name.lines && data.name.lines.ru) {
                nameRu = data.name.lines.ru;
            } else if (data.name.type === 'text' && data.name.text) {
                nameRu = data.name.text;
            }
            const parts = path.relative(DATA_DIR, filePath).split(path.sep);
            const idx = parts.indexOf('items');
            const category = (idx !== -1 && parts.length > idx + 1) ? parts[idx + 1] : 'unknown';
            items.push({ id: data.id, name: nameRu, category, color: data.color || 'DEFAULT' });
        } catch (e) {}
    }
    return items;
}

function loadFromIndex() {
    const raw = fs.readFileSync(INDEX_FILE, 'utf-8');
    const compact = JSON.parse(raw);
    // Разворачиваем компактный формат в полный
    return compact.map(x => ({ id: x.id, name: x.n, category: x.c, color: x.r }));
}

function load() {
    try {
        // 1. Приоритет — предсобранный индекс (быстро и мало памяти)
        if (fs.existsSync(INDEX_FILE)) {
            console.log('📦 Загружаю из items-index.json...');
            ALL_ITEMS = loadFromIndex();
            console.log(`✅ Загружено предметов: ${ALL_ITEMS.length}`);
            isLoaded = true;
            return;
        }
        // 2. Фолбэк — обход папки data/
        if (fs.existsSync(DATA_DIR) && fs.readdirSync(DATA_DIR).length > 0) {
            console.log('📂 Загружаю из data/...');
            ALL_ITEMS = loadFromDataFolder();
            console.log(`✅ Загружено предметов: ${ALL_ITEMS.length}`);
            isLoaded = true;
            return;
        }
        console.log('⚠️ Ни items-index.json, ни data/ не найдены. Загружено 0.');
    } catch (e) {
        console.error('❌ Ошибка загрузки:', e.message);
    }
}

function refreshItems() {
    console.log('🔄 Перезагрузка предметов...');
    load();
}

function getAllItems() { return ALL_ITEMS; }
function getAllCategories() { return Array.from(new Set(ALL_ITEMS.map(i => i.category))).sort(); }
function getAllRarities() { return Array.from(new Set(ALL_ITEMS.map(i => i.color))).sort(); }

load(); // Загружаем при старте

module.exports = { getAllItems, refreshItems, getAllCategories, getAllRarities };
