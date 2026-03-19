const express = require('express');
const path = require('path');
const fs = require('fs');
const { getAccessToken } = require('./src/auth');
const TidalClient = require('./src/client');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

let tokenData = null;
let tidalClient = null;

async function initClient() {
    const tokenFile = path.join(__dirname, 'token.json');
    try {
        const data = fs.readFileSync(tokenFile, 'utf-8');
        tokenData = JSON.parse(data);
        tidalClient = new TidalClient(tokenData.access_token);
    } catch (e) {
        console.error('Error loading token:', e.message);
    }
}

// Serve index.html for all routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to get playlists
app.get('/api/playlists', async (req, res) => {
    if (!tokenData) {
        return res.status(500).json({ error: 'Not authenticated' });
    }
    try {
        const result = await tidalClient.getCollectionPlaylists();
        const playlists = result.included || [];
        res.json({ success: true, data: playlists });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API endpoint to get library artists
app.get('/api/artists', async (req, res) => {
    if (!tokenData) {
        return res.status(500).json({ error: 'Not authenticated' });
    }
    try {
        const result = await tidalClient.getLibraryArtists();
        const artists = result.included || [];
        res.json({ success: true, data: artists });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API endpoint to get artist info
app.get('/api/artist/:id', async (req, res) => {
    if (!tokenData) {
        return res.status(500).json({ error: 'Not authenticated' });
    }
    const artistId = req.params.id;
    
    // Validate that artistId is a positive integer
    const positiveIntegerRegex = /^\d+$/;
    if (!artistId || !positiveIntegerRegex.test(artistId)) {
        return res.status(400).json({ error: `Invalid resource identifier: must be a positive integer (received: "${artistId}")` });
    }
    
    try {
        const result = await tidalClient.getArtistInfo(artistId);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API endpoint to get playlist items
app.get('/api/playlist/:id/items', async (req, res) => {
    if (!tokenData) {
        return res.status(500).json({ error: 'Not authenticated' });
    }
    const playlistId = req.params.id;
    
    // Validate that playlistId is either a positive integer or UUID
    const positiveIntegerRegex = /^\d+$/;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!playlistId || (!positiveIntegerRegex.test(playlistId) && !uuidRegex.test(playlistId))) {
        return res.status(400).json({ error: `Invalid resource identifier: must be a positive integer or UUID (received: "${playlistId}")` });
    }
    
    try {
        const result = await tidalClient.getPlaylistItems(playlistId);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API endpoint to get artist releases
app.get('/api/artist/:id/releases', async (req, res) => {
    if (!tokenData) {
        return res.status(500).json({ error: 'Not authenticated' });
    }
    const artistId = req.params.id;
    
    // Validate that artistId is either a positive integer or UUID
    const positiveIntegerRegex = /^\d+$/;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!artistId || (!positiveIntegerRegex.test(artistId) && !uuidRegex.test(artistId))) {
        return res.status(400).json({ error: `Invalid resource identifier: must be a positive integer or UUID (received: "${artistId}")` });
    }
    
    try {
        const result = await tidalClient.getArtistReleases(artistId);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    initClient();
    console.log(`Tidal API GUI running at http://localhost:${PORT}`);
});
