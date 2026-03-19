const crypto = require('crypto');
const open = require('open');
const axios = require('axios');
const readline = require('readline');

// We use a dummy public HTTPS URL that the user must register.
// https://example.com/callback is a safe standard placeholder.
const REDIRECT_URI = 'https://example.com/callback';
const AUTH_ENDPOINT = 'https://login.tidal.com/authorize';
const TOKEN_ENDPOINT = 'https://auth.tidal.com/v1/oauth2/token';

function base64URLEncode(str) {
    return str.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function sha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest();
}

function generatePKCE() {
    const verifier = base64URLEncode(crypto.randomBytes(32));
    const challenge = base64URLEncode(sha256(verifier));
    return { verifier, challenge };
}

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

async function getAuthCode(clientId) {
    const { verifier, challenge } = generatePKCE();
    const state = crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: REDIRECT_URI,
        //scope: 'playback',
        scope: 'collection.read playlists.read user.read',
        code_challenge_method: 'S256',
        code_challenge: challenge,
        state: state
    });

    const loginUrl = `${AUTH_ENDPOINT}?${params.toString()}`;

    console.log('\n--- MANUAL AUTHENTICATION STEP ---');
    console.log(`1. Ensure you have registered this Redirect URI in your Tidal Dashboard:`);
    console.log(`   ${REDIRECT_URI}`);
    console.log('2. Open this URL in your browser to log in:');
    console.log(loginUrl);
    console.log('3. After logging in, you will be redirected to example.com.');
    console.log('   COPY the entire URL from your browser address bar.');

    // Try to open browser
    try { await open(loginUrl); } catch (e) { }

    const pastedUrl = await askQuestion('\nPaste the full redirected URL here: ');

    try {
        const parsedUrl = new URL(pastedUrl);
        const code = parsedUrl.searchParams.get('code');
        const returnedState = parsedUrl.searchParams.get('state');

        if (state !== returnedState) {
            throw new Error('State mismatch! Security warning.');
        }
        if (!code) {
            throw new Error('No code found in URL');
        }
        return { code, verifier };
    } catch (e) {
        console.error('Error parsing URL:', e.message);
        throw e;
    }
}

async function getAccessToken(clientId, clientSecret, code, verifier) {
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: clientId,
        code_verifier: verifier
    });

    if (clientSecret) {
        params.append('client_secret', clientSecret);
    }

    try {
        const response = await axios.post(TOKEN_ENDPOINT, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching token:', error.response ? error.response.data : error.message);
        throw error;
    }
}

module.exports = {
    getAuthCode,
    getAccessToken
};
