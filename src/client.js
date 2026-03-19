const axios = require('axios');

const API_BASE_URL = 'https://openapi.tidal.com/v2';

class TidalClient {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.client = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/vnd.api+json',
                'Accept': 'application/vnd.api+json'
            }
        });

        this.client.interceptors.request.use(config => {
            const fullUrl = this.client.getUri(config);
            console.log('--- HTTP REQUEST ---');
            console.log(`URL: ${fullUrl}`);
            if (config.params) {
                console.log('Params:', JSON.stringify(config.params, null, 2));
            }
            return config;
        });
    }

    async getUserId() {
        if (this.userId) return this.userId;
        try {
            const response = await this.client.get('/users/me');
            this.userId = response.data.data.id;
            return this.userId;
        } catch (error) {
            console.error('Error fetching user ID:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async getMyPlaylists() {
        // Since V2 separation isn't clear yet, we'll use the userCollections endpoint for now
        // This might return both or just favorites.
        return this.getCollectionPlaylists();
    }

    async getCollectionPlaylists() {
        const userId = await this.getUserId();
        try {
            const response = await this.client.get(`/userCollections/${userId}/relationships/playlists?include=playlists`);
            return response.data;
        } catch (error) {
            console.error('Error fetching playlist collection:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

 

    async getArtistInfo(artistId) {
        try {
            const response = await this.client.get(`/artists/${artistId}?include=image`);
            return response.data;
        } catch (error) {
            console.error('Error fetching artist info:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async getAlbumInfo(albumId) {
        try {
            const response = await this.client.get(`/albums/${albumId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching album info:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async getPlaylistItems(playlistId, limit = 100) {
        try {
            const response = await this.client.get(`/userCollections/${playlistId}/relationships/items?include=items&limit=${limit}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching playlist items:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async getArtistReleases(artistId, limit = 3) {
        try {
            // First fetch artist info to get ID
            const artistInfo = await this.getArtistInfo(artistId);
            const artistIdStr = artistInfo.data?.id;
            
            if (!artistIdStr) {
                throw new Error('Could not get artist ID');
            }
            
            // Get album IDs
            const albumsResponse = await this.client.get(`/artists/${artistIdStr}/relationships/albums?limit=${limit}`);
            const albumIds = albumsResponse.data.data.map(album => album.id);
            
            // Fetch full details for each album with rate limiting
            const releases = [];
            for (const albumId of albumIds) {
                try {
                    const albumInfo = await this.getAlbumInfo(albumId);
                    if (albumInfo.data) {
                        releases.push({
                            id: albumInfo.data.id,
                            type: albumInfo.data.type,
                            attributes: albumInfo.data.attributes,
                            relationships: albumInfo.data.relationships
                        });
                    }
                } catch (e) {
                    if (e.response?.status === 429) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        continue;
                    }
                    throw e;
                }
            }
            
            return { data: releases };
        } catch (error) {
            console.error('Error fetching artist releases:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async getLibraryArtists() {
        const userId = await this.getUserId();
        try {
            const response = await this.client.get(`/userCollections/${userId}/relationships/artists?include=artists&limit=100`);
            return response.data;
        } catch (error) {
            console.error('Error fetching library artists:', error.response ? error.response.data : error.message);
            throw error;
        }
    }
}

module.exports = TidalClient;
