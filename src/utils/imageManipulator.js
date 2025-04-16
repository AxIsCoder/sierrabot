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

module.exports = {
    distortImage,
    cleanupTempFiles
}; 