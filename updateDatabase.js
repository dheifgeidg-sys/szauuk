// updateDatabase.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { refreshItems } = require('./itemLoader'); // Импортируем функцию обновления

// Ссылка на скачивание архива базы данных (ветка main)
const DB_URL = 'https://github.com/EXBO-Studio/stalzone-database/archive/refs/heads/main.zip';
const DATA_DIR = path.join(__dirname, 'data');
const TEMP_ZIP = path.join(__dirname, 'db_temp.zip');

async function downloadAndUpdate() {
    console.log('⏳ Начинаю скачивание базы данных Stalzone...');
    
    try {
        // 1. Скачиваем ZIP-архив
        const response = await axios({
            url: DB_URL,
            method: 'GET',
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(TEMP_ZIP);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        console.log('✅ База скачана. Начинаю распаковку...');

        // 2. Распаковываем архив
        const zip = new AdmZip(TEMP_ZIP);
        
        // Очищаем старую папку data, если она есть
        if (fs.existsSync(DATA_DIR)) {
            fs.rmSync(DATA_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(DATA_DIR, { recursive: true });

        // Распаковываем всё в папку data
        zip.extractAllTo(DATA_DIR, true);
        
        console.log('✅ База успешно распакована!');

        // 3. Удаляем временный ZIP-файл
        fs.unlinkSync(TEMP_ZIP);

        // 4. Обновляем список предметов в памяти
        refreshItems();

    } catch (error) {
        console.error('❌ Ошибка при обновлении базы:', error.message);
        if (fs.existsSync(TEMP_ZIP)) fs.unlinkSync(TEMP_ZIP); // Чистим мусор при ошибке
    }
}

// Запускаем процесс
downloadAndUpdate();