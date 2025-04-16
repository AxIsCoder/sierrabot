const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

/**
 * Get a random GIF from Tenor based on search term
 * @param {string} searchTerm - The search term to query Tenor
 * @returns {Promise<{url: string, id: string}>} Object containing the GIF URL and ID
 */
async function getRandomGif(searchTerm) {
    try {
        // Validate API key
        const apiKey = process.env.TENOR_API_KEY;
        if (!apiKey) {
            throw new Error('Tenor API key not configured. Please add TENOR_API_KEY to your .env file.');
        }
        
        // Fetch GIFs from Tenor
        const response = await axios.get('https://tenor.googleapis.com/v2/search', {
            params: {
                q: searchTerm,
                key: apiKey,
                client_key: 'sierra_discord_bot',
                limit: 10,
                media_filter: 'gif',
                contentfilter: 'medium' // Filter out inappropriate content
            }
        });
        
        // Check if we got results
        if (!response.data || !response.data.results || response.data.results.length === 0) {
            throw new Error(`No GIFs found for search term: ${searchTerm}`);
        }
        
        // Get a random GIF from the results
        const gifResults = response.data.results;
        const randomIndex = Math.floor(Math.random() * gifResults.length);
        const selectedGif = gifResults[randomIndex];
        
        // Find the medium or smallest gif url
        const gifUrl = selectedGif.media_formats.gif.url;
        
        return {
            url: gifUrl,
            id: selectedGif.id
        };
    } catch (error) {
        console.error('Error fetching GIF from Tenor:', error.message);
        throw error;
    }
}

/**
 * Download a GIF from a URL and save it to temp directory
 * @param {string} url - URL of the GIF to download
 * @returns {Promise<string>} - Path to the downloaded GIF
 */
async function downloadGif(url) {
    try {
        // Create temp directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'assets', 'images', 'temp');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Generate unique filename
        const outputPath = path.join(outputDir, `tenor-${uuidv4()}.gif`);
        
        // Download the GIF
        const response = await axios({
            method: 'GET',
            url: url,
            responseType: 'stream'
        });
        
        // Save the GIF to disk
        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);
        
        // Return a promise that resolves when the file is downloaded
        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve(outputPath));
            writer.on('error', reject);
        });
    } catch (error) {
        console.error('Error downloading GIF:', error.message);
        throw error;
    }
}

/**
 * Clean up old temporary files
 * @param {string} directory - Directory to clean
 */
function cleanupTempFiles(directory) {
    try {
        const files = fs.readdirSync(directory);
        const now = Date.now();
        const maxAge = 3600000; // 1 hour in milliseconds
        
        for (const file of files) {
            if (!file.startsWith('tenor-')) continue; // Only clean Tenor files
            
            const filePath = path.join(directory, file);
            const stats = fs.statSync(filePath);
            
            // Delete files older than maxAge
            if (now - stats.mtimeMs > maxAge) {
                fs.unlinkSync(filePath);
            }
        }
    } catch (error) {
        console.error('Error cleaning temp files:', error);
    }
}

module.exports = {
    getRandomGif,
    downloadGif,
    cleanupTempFiles
}; 