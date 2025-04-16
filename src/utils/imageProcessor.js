const { GifUtil, GifFrame } = require('gifwrap');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const gifFrames = require('gif-frames');
const { v4: uuidv4 } = require('uuid');
const { getRandomGif, downloadGif } = require('./tenorApiHandler');

/**
 * Process a slap gif with user avatars
 * @param {string} slapperAvatarURL - URL of the user doing the slapping
 * @param {string} slappedAvatarURL - URL of the user being slapped
 * @returns {Promise<string>} Path to the generated gif
 */
async function createSlapGif(slapperAvatarURL, slappedAvatarURL) {
    try {
        // Define paths
        const templatePath = path.join(__dirname, '..', 'assets', 'images', 'slap-template.gif');
        const outputDir = path.join(__dirname, '..', 'assets', 'images', 'temp');
        const outputPath = path.join(outputDir, `slap-${uuidv4()}.gif`);
        
        // Make sure temp directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Download avatar images
        const slapperAvatar = await Jimp.read(slapperAvatarURL);
        const slappedAvatar = await Jimp.read(slappedAvatarURL);
        
        // Resize avatars to appropriate sizes
        slapperAvatar.resize(100, 100).circle();
        slappedAvatar.resize(100, 100).circle();
        
        // Extract frames from the template gif
        const frameData = await gifFrames({
            url: templatePath,
            frames: 'all',
            outputType: 'jpg'
        });
        
        // Read the template gif
        const templateGif = await GifUtil.read(templatePath);
        
        // Define face positions for each frame
        // These coordinates would need to be adjusted based on your specific template
        const facePositions = [
            // Frame 0: Initial position
            { slapper: { x: 50, y: 50 }, slapped: { x: 200, y: 50 } },
            // Frame 1: Mid slap
            { slapper: { x: 60, y: 50 }, slapped: { x: 190, y: 60 } },
            // Frame 2: Slap impact
            { slapper: { x: 80, y: 50 }, slapped: { x: 180, y: 70 } },
            // Add more frames as needed
        ];
        
        // Process each frame
        const newFrames = [];
        
        for (let i = 0; i < templateGif.frames.length; i++) {
            const frame = templateGif.frames[i];
            
            // Convert GifFrame to Jimp
            const jimpFrame = await GifUtil.copyAsJimp(Jimp, frame);
            
            // Get face positions for this frame
            // If we have more frames than defined positions, use the last defined position
            const position = facePositions[Math.min(i, facePositions.length - 1)];
            
            // Create copies of the avatars for this frame
            const slapperCopy = slapperAvatar.clone();
            const slappedCopy = slappedAvatar.clone();
            
            // Composite the avatars onto the frame
            jimpFrame.composite(slapperCopy, position.slapper.x, position.slapper.y, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacitySource: 1,
                opacityDest: 1
            });
            
            jimpFrame.composite(slappedCopy, position.slapped.x, position.slapped.y, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacitySource: 1,
                opacityDest: 1
            });
            
            // Convert back to GifFrame
            const newFrame = GifUtil.copyFromJimp(frame, jimpFrame);
            newFrames.push(newFrame);
        }
        
        // Create the new gif
        await GifUtil.write(outputPath, newFrames, templateGif);
        
        // Clean up old temporary files
        cleanupTempFiles(outputDir);
        
        return outputPath;
    } catch (error) {
        console.error('Error creating slap gif:', error);
        throw error;
    }
}

/**
 * Process a Tenor GIF with user avatars
 * @param {string} slapperAvatarURL - URL of the user doing the slapping
 * @param {string} slappedAvatarURL - URL of the user being slapped
 * @returns {Promise<{path: string, id: string}>} Object containing path to the generated gif and Tenor GIF ID
 */
async function createTenorSlapGif(slapperAvatarURL, slappedAvatarURL) {
    try {
        // Get a random slap GIF from Tenor
        const gifResult = await getRandomGif('anime slap');
        
        // Download the GIF
        const tenorGifPath = await downloadGif(gifResult.url);
        
        // Create output directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'assets', 'images', 'temp');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Define output path
        const outputPath = path.join(outputDir, `tenor-processed-${uuidv4()}.gif`);
        
        // Download avatar images - fixed Jimp.read usage
        const slapperAvatar = await Jimp.read(slapperAvatarURL);
        const slappedAvatar = await Jimp.read(slappedAvatarURL);
        
        // Resize avatars to appropriate sizes - adjust these based on typical GIF size
        slapperAvatar.resize(80, 80).circle();
        slappedAvatar.resize(80, 80).circle();
        
        // Read the tenor gif
        const tenorGif = await GifUtil.read(tenorGifPath);
        
        // Define default face positions - will be adjusted based on frame count
        // These are just example positions that might work for typical anime slap GIFs
        // You'll need to adjust these or implement a more sophisticated face detection approach
        const frameCount = tenorGif.frames.length;
        
        // Dynamically determine face positions based on frame count
        // This is a simple approach - in a real implementation, you might want to use 
        // actual face detection for each specific GIF
        const facePositions = [];
        
        // Create dynamic face positions based on frame count and typical slap animation
        for (let i = 0; i < frameCount; i++) {
            const progress = i / (frameCount - 1); // 0 to 1 progress through the animation
            
            // Default (arbitrary) positions - adjust based on your testing with actual GIFs
            // Assuming standard 498x498 Tenor GIF dimensions
            let slapperX = 100 + Math.floor(progress * 50); // Slapper moves right during animation
            let slapperY = 150;
            
            let slappedX = 300;
            let slappedY = 150 + Math.floor(progress * 30) * (i > frameCount / 2 ? 1 : 0); // Slapped reacts in second half
            
            // Add position for this frame
            facePositions.push({
                slapper: { x: slapperX, y: slapperY },
                slapped: { x: slappedX, y: slappedY }
            });
        }
        
        // Process each frame
        const newFrames = [];
        
        for (let i = 0; i < tenorGif.frames.length; i++) {
            const frame = tenorGif.frames[i];
            
            // Convert GifFrame to Jimp
            const jimpFrame = await GifUtil.copyAsJimp(Jimp, frame);
            
            // Get face positions for this frame
            const position = facePositions[i];
            
            // Create copies of the avatars for this frame
            const slapperCopy = slapperAvatar.clone();
            const slappedCopy = slappedAvatar.clone();
            
            // Composite the avatars onto the frame
            jimpFrame.composite(slapperCopy, position.slapper.x, position.slapper.y, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacitySource: 0.9, // Slightly transparent
                opacityDest: 1
            });
            
            jimpFrame.composite(slappedCopy, position.slapped.x, position.slapped.y, {
                mode: Jimp.BLEND_SOURCE_OVER,
                opacitySource: 0.9, // Slightly transparent
                opacityDest: 1
            });
            
            // Convert back to GifFrame
            const newFrame = GifUtil.copyFromJimp(frame, jimpFrame);
            newFrames.push(newFrame);
        }
        
        // Create the new gif
        await GifUtil.write(outputPath, newFrames, tenorGif);
        
        // Delete the original Tenor GIF to save space
        fs.unlinkSync(tenorGifPath);
        
        // Clean up old temporary files
        cleanupTempFiles(outputDir);
        
        return {
            path: outputPath,
            id: gifResult.id
        };
    } catch (error) {
        console.error('Error creating Tenor slap gif with avatars:', error);
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

module.exports = { createSlapGif, createTenorSlapGif, cleanupTempFiles }; 