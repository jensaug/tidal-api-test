require('dotenv').config();
const fs = require('fs/promises');
const path = require('path');
const { getAuthCode, getAccessToken } = require('./src/auth');
const TidalClient = require('./src/client');

const TOKEN_FILE = path.join(__dirname, 'token.json');

async function loadToken() {
    try {
        const data = await fs.readFile(TOKEN_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

async function saveToken(tokenData) {
    await fs.writeFile(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
}

let tokenData;

async function run() {
    const clientId = process.env.TIDAL_CLIENT_ID;
    const clientSecret = process.env.TIDAL_CLIENT_SECRET;

    if (!clientId) {
        console.error('Error: TIDAL_CLIENT_ID not found in .env file.');
        console.error('Please create a .env file based on .env.example');
        process.exit(1);
    }

    tokenData = await loadToken();
    if (!tokenData) {
        console.error('No cached token found. Exiting.');
        process.exit(1);
    }
}

let artistIds = new Set();

  async function mainBody() {
    artistIds.clear();
    const client = new TidalClient(tokenData.access_token);

    try {
        console.log('\n--- Fetching Playlists (OpenAPI V2) ---');
        const playlists = await client.getCollectionPlaylists();

        console.log('\n--- Artist IDs from your library ---');
        const artists = await client.getLibraryArtists();
        if (artists && artists.data) {
            artists.data.forEach(artist => {
                if (artist.attributes && artist.attributes.name) {
                    console.log(`- ${artist.attributes.name} (ID: ${artist.id})`);
                    artistIds.add(artist.id);
                }
            });
        } else {
            console.log('No artists found in library.');
        }
        
        console.log('\nYou can use these artist IDs to fetch statistics:');
        console.log('Example: node index.js 12345');
        artistIds.forEach(id => console.log(`  - ${id}`));
    } catch (error) {
        console.error('Error in main execution:');
        console.error(error.message);
        if (error.response?.status === 401) {
            console.log('Token might be expired. Deleting token.json. Please run again.');
            await fs.unlink(TOKEN_FILE).catch(() => { });
        }
    }
}

async function fetchArtistStats(artistId) {
    const client = new TidalClient(tokenData.access_token);
    
    console.log(`\n--- Fetching Listening Statistics for Artist ${artistId} ---`);
    
    try {
        const info = await client.getArtistInfo(artistId);
        
        console.log('\nArtist Info:');
        if (info.data) {
            console.log(`- ID: ${info.data.id}`);
            console.log(`- Name: ${info.data.attributes.name}`);
            if (info.data.relationships && info.data.relationships.image && info.data.relationships.image.data) {
                console.log(`- Image: ${info.data.relationships.image.data.attributes.url}`);
            }
        }
        
        console.log('\n--- Fetching Recent Releases ---');
        const releases = await client.getArtistReleases(artistId, 3);
        if (releases && releases.data) {
            console.log('\nRecent Releases:');
            releases.data.forEach(release => {
                const title = release.attributes?.title || 'Unknown';
                const releaseDate = release.attributes?.releaseDate;
                const year = releaseDate ? new Date(releaseDate).getFullYear() : 'N/A';
                console.log(`- ${title} (${year})`);
            });
        }
    } catch (error) {
        console.error('Error fetching artist statistics:');
        console.error(error.message);
    }
}

// Check for command line arguments
const args = process.argv.slice(2);
const artistId = args[0];

async function main() {
    await run();
    if (artistId) {
        await fetchArtistStats(artistId);
    } else {
        await mainBody();
    }
}

main().catch(console.error);