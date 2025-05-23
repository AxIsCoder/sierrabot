const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

/**
 * Apply distortion effects to an image
 * @param {string} imageUrl - URL of the image to distort
 * @param {string} effect - Type of distortion effect to apply
 * @returns {Promise<string>} - Path to the distorted image
 */
async function distortImage(imageUrl, effect = 'random') {
    try {
        // Create temp directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'assets', 'images', 'temp');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Generate unique filenames
        const tempImagePath = path.join(outputDir, `original-${uuidv4()}.png`);
        const outputPath = path.join(outputDir, `distort-${uuidv4()}.png`);
        
        // Download the image first
        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'arraybuffer'
        });
        
        // Save the downloaded image
        fs.writeFileSync(tempImagePath, Buffer.from(response.data));
        
        // Read the image using Jimp
        const image = await Jimp.read(tempImagePath);
        
        // Delete the temporary original image
        fs.unlinkSync(tempImagePath);
        
        // Choose effect if random
        if (effect === 'random') {
            const effects = ['bulge', 'pixelate', 'blur', 'invert', 'glitch', 'deepfry'];
            effect = effects[Math.floor(Math.random() * effects.length)];
        }
        
        // Apply selected effect
        switch (effect) {
            case 'bulge':
                applyBulgeEffect(image);
                break;
            
            case 'pixelate':
                image.pixelate(10);
                break;
            
            case 'blur':
                image.blur(10);
                break;
                
            case 'invert':
                image.invert();
                break;
                
            case 'glitch':
                applyGlitchEffect(image);
                break;
                
            case 'deepfry':
                applyDeepfryEffect(image);
                break;
                
            default:
                // Default to pixelate if effect not recognized
                image.pixelate(10);
        }
        
        // Save the distorted image
        await image.writeAsync(outputPath);
        
        // Clean up old files
        cleanupTempFiles(outputDir);
        
        return {
            path: outputPath,
            effect: effect
        };
    } catch (error) {
        console.error('Error distorting image:', error);
        throw error;
    }
}

/**
 * Apply a bulge/fisheye effect to the image
 * @param {Jimp} image - Jimp image object
 */
function applyBulgeEffect(image) {
    const width = image.getWidth();
    const height = image.getHeight();
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2;
    const strength = 2.5; // Bulge strength
    
    // Create a new image to avoid artifacts
    const distorted = new Jimp(width, height);
    
    // Process each pixel
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            // Calculate distance from center
            const dx = (x - centerX) / radius;
            const dy = (y - centerY) / radius;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 1) {
                // Apply distortion
                const distortionFactor = Math.pow(Math.sin(distance * Math.PI / 2), -strength);
                const newX = Math.floor(centerX + dx * distortionFactor * radius);
                const newY = Math.floor(centerY + dy * distortionFactor * radius);
                
                // Check bounds
                if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                    const color = image.getPixelColor(newX, newY);
                    distorted.setPixelColor(color, x, y);
                }
            } else {
                // Keep pixels outside radius the same
                const color = image.getPixelColor(x, y);
                distorted.setPixelColor(color, x, y);
            }
        }
    }
    
    // Copy distorted image back to original
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            image.setPixelColor(distorted.getPixelColor(x, y), x, y);
        }
    }
}

/**
 * Apply a glitch effect to the image
 * @param {Jimp} image - Jimp image object
 */
function applyGlitchEffect(image) {
    const width = image.getWidth();
    const height = image.getHeight();
    
    // Add color shifting
    for (let y = 0; y < height; y++) {
        if (Math.random() < 0.1) { // 10% chance of glitching a line
            const offsetX = Math.floor(Math.random() * 10) - 5; // -5 to 5 pixel shift
            
            if (offsetX !== 0) {
                for (let x = 0; x < width; x++) {
                    const srcX = x - offsetX;
                    
                    if (srcX >= 0 && srcX < width) {
                        // Apply RGB channel shift
                        const color = image.getPixelColor(srcX, y);
                        
                        // Extract RGBA components
                        const rgba = Jimp.intToRGBA(color);
                        
                        // Random channel boost
                        const channel = Math.floor(Math.random() * 3);
                        if (channel === 0) rgba.r = Math.min(255, rgba.r + 50);
                        if (channel === 1) rgba.g = Math.min(255, rgba.g + 50);
                        if (channel === 2) rgba.b = Math.min(255, rgba.b + 50);
                        
                        const newColor = Jimp.rgbaToInt(rgba.r, rgba.g, rgba.b, rgba.a);
                        image.setPixelColor(newColor, x, y);
                    }
                }
            }
        }
    }
    
    // Add random blocks of corruption
    const numBlocks = Math.floor(Math.random() * 5) + 3;
    for (let i = 0; i < numBlocks; i++) {
        const blockX = Math.floor(Math.random() * width);
        const blockY = Math.floor(Math.random() * height);
        const blockW = Math.min(Math.floor(Math.random() * 30) + 10, width - blockX);
        const blockH = Math.min(Math.floor(Math.random() * 10) + 5, height - blockY);
        
        const sourceX = Math.floor(Math.random() * (width - blockW));
        const sourceY = Math.floor(Math.random() * (height - blockH));
        
        // Copy block from one area to another
        for (let y = 0; y < blockH; y++) {
            for (let x = 0; x < blockW; x++) {
                const color = image.getPixelColor(sourceX + x, sourceY + y);
                image.setPixelColor(color, blockX + x, blockY + y);
            }
        }
    }
    
    // Apply slight blur to simulate JPEG artifacts
    image.blur(1);
}

/**
 * Apply a deep-fried meme effect to the image
 * @param {Jimp} image - Jimp image object
 */
function applyDeepfryEffect(image) {
    // Increase contrast
    image.contrast(0.5);
    
    // Increase saturation
    for (let x = 0; x < image.getWidth(); x++) {
        for (let y = 0; y < image.getHeight(); y++) {
            const color = image.getPixelColor(x, y);
            const rgba = Jimp.intToRGBA(color);
            
            // Boost red and yellow channels
            rgba.r = Math.min(255, Math.floor(rgba.r * 1.4));
            rgba.g = Math.min(255, Math.floor(rgba.g * 1.2));
            
            const newColor = Jimp.rgbaToInt(rgba.r, rgba.g, rgba.b, rgba.a);
            image.setPixelColor(newColor, x, y);
        }
    }
    
    // Add noise
    for (let i = 0; i < image.getWidth() * image.getHeight() * 0.05; i++) {
        const x = Math.floor(Math.random() * image.getWidth());
        const y = Math.floor(Math.random() * image.getHeight());
        const color = Jimp.rgbaToInt(255, 255, 255, 255);
        image.setPixelColor(color, x, y);
    }
    
    // Reduce quality (simulate multiple compressions)
    image.quality(10);
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
            if (!file.startsWith('distort-')) continue; // Only clean distort files
            
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

/**
 * Create a meme with custom text
 * @param {string} imageUrl - URL of the image to use as meme base
 * @param {string} topText - Text for the top of the meme
 * @param {string} bottomText - Text for the bottom of the meme
 * @returns {Promise<Object>} - Object containing path to meme image
 */
async function createMeme(imageUrl, topText = '', bottomText = '') {
    try {
        // Create temp directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'assets', 'images', 'temp');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Generate unique filenames
        const outputPath = path.join(outputDir, `meme-${uuidv4()}.png`);
        
        // Download the image
        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'arraybuffer'
        });
        
        // Create image from buffer
        const image = await Jimp.read(Buffer.from(response.data));
        
        // Get image dimensions
        const width = image.getWidth();
        const height = image.getHeight();
        
        // Load fonts of different sizes
        const fonts = {
            large: await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE),
            medium: await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE),
            small: await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE)
        };
        
        // Function to determine appropriate font size based on text length and image width
        function getAppropriateFont(text) {
            const maxWidth = width * 0.9; // 90% of image width
            const largeWidth = Jimp.measureText(fonts.large, text);
            const mediumWidth = Jimp.measureText(fonts.medium, text);
            
            if (largeWidth <= maxWidth) return fonts.large;
            if (mediumWidth <= maxWidth) return fonts.medium;
            return fonts.small;
        }
        
        // Add text to the image
        if (topText) {
            const font = getAppropriateFont(topText);
            const textWidth = Jimp.measureText(font, topText);
            const x = Math.floor((width - textWidth) / 2);
            const y = 20; // Fixed top margin
            
            // Add text shadow for better visibility
            image.print(font, x + 2, y + 2, topText);
            image.print(font, x, y, topText);
        }
        
        if (bottomText) {
            const font = getAppropriateFont(bottomText);
            const textWidth = Jimp.measureText(font, bottomText);
            const x = Math.floor((width - textWidth) / 2);
            // Calculate bottom position based on font height with larger margin
            const fontHeight = font.height || 32; // Fallback to 32 if height is not available
            const bottomMargin = 40; // Increased bottom margin
            const y = height - fontHeight - bottomMargin; // Increased margin from bottom
            
            // Add text shadow for better visibility
            image.print(font, x + 2, y + 2, bottomText);
            image.print(font, x, y, bottomText);
        }
        
        // Save the meme image
        await image.writeAsync(outputPath);
        
        // Clean up old files
        cleanupTempFiles(outputDir);
        
        return {
            path: outputPath
        };
    } catch (error) {
        console.error('Error creating meme:', error);
        throw error;
    }
}

/**
 * Apply filters to an image
 * @param {string} imageUrl - URL of the image
 * @param {string} filter - Type of filter to apply
 * @returns {Promise<Object>} - Object containing path to filtered image
 */
async function applyFilter(imageUrl, filter = 'sepia') {
    try {
        // Create temp directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'assets', 'images', 'temp');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Generate unique filename
        const outputPath = path.join(outputDir, `filter-${uuidv4()}.png`);
        
        // Download the image
        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'arraybuffer'
        });
        
        // Create image from buffer
        const image = await Jimp.read(Buffer.from(response.data));
        
        // Apply selected filter
        switch (filter) {
            case 'sepia':
                applySepiaFilter(image);
                break;
                
            case 'grayscale':
                image.greyscale();
                break;
                
            case 'vintage':
                applyVintageFilter(image);
                break;
                
            case 'posterize':
                applyPosterizeFilter(image);
                break;
                
            case 'negative':
                image.invert();
                break;
                
            default:
                // Default to sepia if filter not recognized
                applySepiaFilter(image);
        }
        
        // Save the filtered image
        await image.writeAsync(outputPath);
        
        // Clean up old files
        cleanupTempFiles(outputDir);
        
        return {
            path: outputPath,
            filter: filter
        };
    } catch (error) {
        console.error('Error applying filter:', error);
        throw error;
    }
}

/**
 * Apply a sepia filter to the image
 * @param {Jimp} image - Jimp image object
 */
function applySepiaFilter(image) {
    // First convert to greyscale
    image.greyscale();
    
    // Then add sepia toning
    image.scan(0, 0, image.getWidth(), image.getHeight(), function(x, y, idx) {
        const color = image.getPixelColor(x, y);
        const rgba = Jimp.intToRGBA(color);
        
        // Apply sepia effect
        const r = Math.min(255, rgba.r * 1.07);
        const g = Math.min(255, rgba.g * 0.74);
        const b = Math.min(255, rgba.b * 0.43);
        
        const newColor = Jimp.rgbaToInt(r, g, b, rgba.a);
        image.setPixelColor(newColor, x, y);
    });
}

/**
 * Apply a vintage filter to the image
 * @param {Jimp} image - Jimp image object
 */
function applyVintageFilter(image) {
    // Add slight sepia tone
    applySepiaFilter(image);
    
    // Reduce contrast
    image.contrast(-0.1);
    
    // Add vignette
    const width = image.getWidth();
    const height = image.getHeight();
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
    
    image.scan(0, 0, width, height, function(x, y, idx) {
        // Calculate distance from center
        const distX = centerX - x;
        const distY = centerY - y;
        const distance = Math.sqrt(distX * distX + distY * distY);
        
        // Calculate vignette factor
        let factor = 1 - (distance / maxDistance) * 0.8;
        factor = Math.max(0.3, factor); // Don't go too dark
        
        // Apply vignette
        const color = image.getPixelColor(x, y);
        const rgba = Jimp.intToRGBA(color);
        
        rgba.r = Math.floor(rgba.r * factor);
        rgba.g = Math.floor(rgba.g * factor);
        rgba.b = Math.floor(rgba.b * factor);
        
        const newColor = Jimp.rgbaToInt(rgba.r, rgba.g, rgba.b, rgba.a);
        image.setPixelColor(newColor, x, y);
    });
    
    // Add noise
    addNoise(image, 0.03);
}

/**
 * Apply a posterize filter to the image
 * @param {Jimp} image - Jimp image object
 */
function applyPosterizeFilter(image) {
    const levels = 5; // Number of levels per channel
    
    image.scan(0, 0, image.getWidth(), image.getHeight(), function(x, y, idx) {
        const color = image.getPixelColor(x, y);
        const rgba = Jimp.intToRGBA(color);
        
        // Posterize each channel
        rgba.r = Math.floor(Math.floor(rgba.r / 255 * (levels - 1) + 0.5) / (levels - 1) * 255);
        rgba.g = Math.floor(Math.floor(rgba.g / 255 * (levels - 1) + 0.5) / (levels - 1) * 255);
        rgba.b = Math.floor(Math.floor(rgba.b / 255 * (levels - 1) + 0.5) / (levels - 1) * 255);
        
        const newColor = Jimp.rgbaToInt(rgba.r, rgba.g, rgba.b, rgba.a);
        image.setPixelColor(newColor, x, y);
    });
    
    // Increase contrast
    image.contrast(0.2);
}

/**
 * Add noise to an image
 * @param {Jimp} image - Jimp image object
 * @param {number} intensity - Noise intensity (0-1)
 */
function addNoise(image, intensity = 0.05) {
    const width = image.getWidth();
    const height = image.getHeight();
    const pixelsToAffect = Math.floor(width * height * intensity);
    
    for (let i = 0; i < pixelsToAffect; i++) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);
        const noise = Math.floor(Math.random() * 50) - 25; // -25 to 25
        
        const color = image.getPixelColor(x, y);
        const rgba = Jimp.intToRGBA(color);
        
        rgba.r = Math.max(0, Math.min(255, rgba.r + noise));
        rgba.g = Math.max(0, Math.min(255, rgba.g + noise));
        rgba.b = Math.max(0, Math.min(255, rgba.b + noise));
        
        const newColor = Jimp.rgbaToInt(rgba.r, rgba.g, rgba.b, rgba.a);
        image.setPixelColor(newColor, x, y);
    }
}

/**
 * Create a profile card with user stats
 * @param {string} avatarUrl - URL of the user's avatar
 * @param {Object} userData - User data to display
 * @returns {Promise<Object>} - Object containing path to profile card image
 */
async function createProfileCard(avatarUrl, userData) {
    try {
        // Create temp directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'assets', 'images', 'temp');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Generate unique filename
        const outputPath = path.join(outputDir, `profile-${uuidv4()}.png`);
        
        // Smaller card size
        const cardWidth = 400;
        const cardHeight = 200;
        const image = new Jimp(cardWidth, cardHeight, 0x23272aff); // Discord dark background
        
        // Download the avatar
        const response = await axios({
            url: avatarUrl,
            method: 'GET',
            responseType: 'arraybuffer'
        });
        
        // Load the avatar image
        const avatar = await Jimp.read(Buffer.from(response.data));
        
        // Smaller avatar, circular
        avatar.resize(64, 64);
        const mask = new Jimp(64, 64, 0x00000000);
        const radius = 32;
        mask.scan(0, 0, 64, 64, function(x, y, idx) {
            const distX = x - radius;
            const distY = y - radius;
            const distance = Math.sqrt(distX * distX + distY * distY);
            if (distance <= radius) {
                this.setPixelColor(0xffffffff, x, y);
            }
        });
        avatar.mask(mask, 0, 0);
        image.composite(avatar, 16, 16);
        
        // Load smaller fonts
        const font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
        const smallFont = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
        
        // Add username (bold, slightly larger)
        image.print(font, 96, 20, {
            text: userData.username,
            alignmentX: Jimp.HORIZONTAL_ALIGN_LEFT,
            alignmentY: Jimp.VERTICAL_ALIGN_TOP
        }, cardWidth - 110, 24);
        
        // Add user stats, stacked vertically
        let yPos = 50;
        if (userData.rank) {
            image.print(smallFont, 96, yPos, `Rank: #${userData.rank}`);
            yPos += 20;
        }
        if (userData.messages) {
            image.print(smallFont, 96, yPos, `Messages: ${userData.messages}`);
            yPos += 20;
        }
        if (userData.joined) {
            image.print(smallFont, 96, yPos, `Joined: ${userData.joined}`);
            yPos += 20;
        }
        if (userData.level) {
            // Draw smaller level bar
            const barWidth = 180;
            const barHeight = 10;
            const barX = 96;
            const barY = cardHeight - 36;
            // Background bar
            image.scan(barX, barY, barWidth, barHeight, function(x, y, idx) {
                this.setPixelColor(0x444444ff, x, y);
            });
            // Progress bar
            const progress = Math.min(1, Math.max(0, userData.xp / userData.levelupXp));
            const progressWidth = Math.floor(barWidth * progress);
            image.scan(barX, barY, progressWidth, barHeight, function(x, y, idx) {
                this.setPixelColor(0x7289daff, x, y); // Discord blue color
            });
            // Print level text
            image.print(smallFont, barX, barY - 16, `Level ${userData.level}`);
            image.print(smallFont, barX + barWidth - 80, barY - 16, `${userData.xp}/${userData.levelupXp} XP`);
        }
        // Add thin border
        image.scan(0, 0, cardWidth, cardHeight, function(x, y, idx) {
            if (x < 2 || y < 2 || x >= cardWidth - 2 || y >= cardHeight - 2) {
                this.setPixelColor(0x7289daff, x, y); // Discord blue border
            }
        });
        // Save the profile card
        await image.writeAsync(outputPath);
        // Clean up old files
        cleanupTempFiles(outputDir);
        return {
            path: outputPath
        };
    } catch (error) {
        console.error('Error creating profile card:', error);
        throw error;
    }
}

module.exports = {
    distortImage,
    applyFilter,
    createMeme,
    createProfileCard
}; 