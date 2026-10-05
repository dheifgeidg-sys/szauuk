// itemLoader.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Рекурсивный обход папок
function walkDir(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walkDir(filePath, fileList);
        } else if (file.endsWith('.json')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

function loadAllItems() {
    const allFiles = walkDir(DATA_DIR);
    const items = [];
    let skipped = 0;

    for (const filePath of allFiles) {
        try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(raw);

            if (!data.id || !data.name) { skipped++; continue; }

            // Извлекаем название
            let nameRu = data.id;
            if (data.name.type === 'translation' && data.name.lines && data.name.lines.ru) {
                nameRu = data.name.lines.ru;
            } else if (data.name.type === 'text' && data.name.text) {
                nameRu = data.name.text;
            }

            // Извлекаем категорию из пути к файлу
            const relativePath = path.relative(DATA_DIR, filePath);
            const parts = relativePath.split(path.sep);

            const itemsIndex = parts.indexOf('items');
            let category = 'unknown';
            let subcategory = '';

            if (itemsIndex !== -1 && parts.length > itemsIndex + 1) {
                category = parts[itemsIndex + 1];
                if (parts.length > itemsIndex + 2) {
                    subcategory = parts[itemsIndex + 2];
                }
            }

            // Редкость: пробуем разные поля
            // Для оружия/брони — data.color (RANK_*)
            // Для артефактов может быть quality, rarity или что-то ещё
            let rarity = data.color || data.quality || data.rarity || 'DEFAULT';

            items.push({
                id: data.id,
                name: nameRu,
                category: category,
                subcategory: subcategory,
                color: rarity
            });
        } catch (e) {
            skipped++;
        }
    }

    // Статистика
    const categories = {};
    items.forEach(i => { categories[i.category] = (categories[i.category] || 0) + 1; });
    console.log('📊 Категории:', categories);

    const rarities = {};
    items.forEach(i => { rarities[i.color] = (rarities[i.color] || 0) + 1; });
    console.log('📊 Редкости:', rarities);

    console.log(`✅ Загружено предметов: ${items.length} (пропущено: ${skipped})`);
    return items;
}

let ALL_ITEMS = loadAllItems();

function refreshItems() {
    console.log('🔄 Обновляю список предметов...');
    ALL_ITEMS = loadAllItems();
}

function getAllCategories() {
    const cats = new Set();
    ALL_ITEMS.forEach(i => cats.add(i.category));
    return Array.from(cats).sort();
}

function getAllRarities() {
    const rar = new Set();
    ALL_ITEMS.forEach(i => rar.add(i.color));
    return Array.from(rar).sort();
}

module.exports = { 
    getAllItems: () => ALL_ITEMS, 
    refreshItems,
    getAllCategories,
    getAllRarities
};