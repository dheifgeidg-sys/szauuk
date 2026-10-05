// api.js
const axios = require('axios');
const config = require('./config');

const apiClient = axios.create({
    baseURL: config.stalzone.apiUrl,
    headers: { 'Content-Type': 'application/json' }
});

// 1. Список регионов
async function fetchRegions(token) {
    const res = await apiClient.get('/regions', { headers: { 'Authorization': `Bearer ${token}` } });
    return res.data;
}

// 2. Статус выброса
async function fetchEmissionStatus(token, region) {
    const res = await apiClient.get(`/${region}/emission`, { headers: { 'Authorization': `Bearer ${token}` } });
    return res.data;
}

// 3. История цен
async function fetchItemHistory(token, region, itemId, limit = 20) {
    const res = await apiClient.get(`/${region}/auction/${itemId}/history`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { limit }
    });
    return res.data;
}

// 4. Активные лоты на аукционе
async function fetchActiveLots(token, region, itemId, limit = 200) {
    const res = await apiClient.get(`/${region}/auction/${itemId}/lots`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { limit }
    });
    
    if (res.data && res.data.lots && res.data.lots.length > 0) {
        console.log('=== ПРИМЕР ЛОТА ===');
        console.log(JSON.stringify(res.data.lots[0], null, 2));
        console.log('===================');
    } else {
        console.log(`ℹ️ Лотов для ${itemId} в регионе ${region}: ${res.data?.total || 0}`);
    }
    
    return res.data;
}

// 5. Профиль персонажа
async function fetchCharacterProfile(token, region, characterName) {
    const res = await apiClient.get(`/${region}/character/by-name/${characterName}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.data;
}

// ВОТ ЭТА СТРОКА САМАЯ ВАЖНАЯ, БЕЗ НЕЁ БУДЕТ ОШИБКА
module.exports = { 
    fetchRegions, 
    fetchEmissionStatus, 
    fetchItemHistory, 
    fetchActiveLots,
    fetchCharacterProfile
};