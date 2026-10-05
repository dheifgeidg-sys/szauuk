// config.js
require('dotenv').config();

module.exports = {
    stalzone: {
        clientId: process.env.STALZONE_CLIENT_ID,
        clientSecret: process.env.STALZONE_CLIENT_SECRET,
        redirectUri: process.env.REDIRECT_URI || 'http://localhost:3000/callback',
        authorizeUrl: 'https://exbo.net/oauth/authorize',
        tokenUrl: 'https://exbo.net/oauth/token',
        apiUrl: 'https://eapi.stalzone.com'
    },
    port: process.env.PORT || 3000
};