// auth.js
const axios = require('axios');
const config = require('./config');

function getAuthUrl() {
    const params = new URLSearchParams({
        client_id: config.stalzone.clientId,
        redirect_uri: config.stalzone.redirectUri,
        response_type: 'code'
    });
    return `${config.stalzone.authorizeUrl}?${params.toString()}`;
}

async function getAccessToken(code) {
    try {
        console.log('--- Начинаю обмен кода на токен ---');
        
        const authString = Buffer.from(`${config.stalzone.clientId}:${config.stalzone.clientSecret}`).toString('base64');
        
        const response = await axios.post(config.stalzone.tokenUrl, new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: config.stalzone.redirectUri
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${authString}`
            }
        });
        
        console.log('✅ Токен успешно получен!');
        return response.data.access_token;
    } catch (error) {
        console.error('❌ ОШИБКА при получении токена:');
        if (error.response) {
            console.error('Статус:', error.response.status);
            console.error('Данные от сервера:', error.response.data);
        } else {
            console.error('Сообщение:', error.message);
        }
        throw error;
    }
}

module.exports = { getAuthUrl, getAccessToken };