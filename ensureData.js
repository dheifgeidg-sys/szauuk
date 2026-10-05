// ensureData.js — скачивание базы при первом запуске
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir) || fs.readdirSync(dataDir).length === 0) {
    console.log('📥 База данных не найдена, скачиваю...');
    try {
        execSync('node updateDatabase.js', { stdio: 'inherit' });
        console.log('✅ База загружена');
    } catch (e) {
        console.error('❌ Ошибка загрузки базы:', e.message);
    }
} else {
    console.log('📦 База данных найдена локально');
}
