const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');

const TOKEN_FILE = path.join(__dirname, 'token.json');

async function loadToken() {
    try {
        const data = await fs.readFile(TOKEN_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

async function probe() {
    const tokenData = await loadToken();
    if (!tokenData) {
        console.log('No token found.');
        return;
    }
    const accessToken = tokenData.access_token;
    console.log('Using token:', accessToken.substring(0, 10) + '...');

    const endpoints = [
        'https://openapi.tidal.com/v2/userCollections/202803727/relationships/playlists'
    ];

    for (const url of endpoints) {
        console.log(`\nProbing ${url}...`);
        try {
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.api+json' // JSON:API requirement
                }
            });
            console.log(`SUCCESS [${response.status}]`);
            // console.log(JSON.stringify(response.data, null, 2).substring(0, 200));
            console.log(response.data);
        } catch (error) {
            console.log(`FAILED [${error.response?.status}]: ${error.message}`);
            if (error.response?.data) {
                console.log('Error details:', JSON.stringify(error.response.data, null, 2));
            }
        }
    }
}

probe();
