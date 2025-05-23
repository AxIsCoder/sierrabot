const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES, BOT_NAME } = require('../../utils/constants');
const axios = require('axios');
require('dotenv').config();

// Tenor API Key - using a fallback key (please get your own from developers.google.com/tenor)
const TENOR_API_KEY = process.env.TENOR_API_KEY || 'AIzaSyDvZ6OOEf6Tah_GRD_4Q7vOtqhaiMQO1VM';

// List of NSFW/inappropriate terms to filter out - simplified but comprehensive list
const NSFW_TERMS = [
    'nsfw', 'porn', 'sex', 'nude', 'naked', 'hentai', 'boobs', 'ass', 
    'dick', 'cock', 'penis', 'vagina', 'pussy', 'anal', 'dildo', 
    'blowjob', 'handjob', 'tits', 'cum', 'masturbation',
    'rule34', 'xxx', 'erotic', 'bdsm', 'fetish'
];

// Collection of "naughty naughty" reaction GIFs (all family-friendly)
const REACTION_GIFS = [
    'https://media.tenor.com/Qrx6-cF0RgYAAAAC/no-nope.gif', // Lady finger wagging "no no no"
    'https://media.tenor.com/jLl1u_m-UMcAAAAC/tenor.gif', // Family Guy Stewie "Oh no no no no"
    'https://media.tenor.com/Y_ntjMoR9HUAAAAC/naughty-wagging-finger.gif', // Man wagging finger
    'https://media.tenor.com/pDCmfTY9CGgAAAAC/jurassic-park-ah-ah-ah.gif', // Jurassic Park "ah ah ah"
    'https://media.tenor.com/OtyR6OU2UesAAAAC/tenor.gif', // Disappointed head shake
    'https://media.tenor.com/VAlFkRa_GrUAAAAC/oh-no-you-didnt.gif', // "Oh no you didn't"
];

/**
 * Gets a random "naughty" reaction GIF
 * @returns {string} URL to a random reaction GIF
 */
function getRandomReactionGif() {
    const randomIndex = Math.floor(Math.random() * REACTION_GIFS.length);
    return REACTION_GIFS[randomIndex];
}

/**
 * Checks if a string contains any NSFW terms - simplified for reliability
 * @param {string} text - The text to check
 * @returns {boolean} - Whether the text contains NSFW terms
 */
function containsNSFWTerms(text) {
    // Basic validation
    if (!text || typeof text !== 'string') return false;
    
    // Simple check - normalize to lowercase and check if includes any terms
    const normalizedText = text.toLowerCase().trim();
    
    // Direct check against each term
    for (const term of NSFW_TERMS) {
        if (normalizedText === term || normalizedText.includes(term)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Compact error handling function to log errors without full stack traces
 * @param {Error} error - The error object
 * @param {string} context - Context for the error
 */
function handleError(error, context) {
    if (error.code) {
        // For Discord API errors, just log a compact message
        console.log(`[ERROR] ${context}: ${error.code} - ${error.message || 'Unknown error'}`);
    } else {
        // For other errors, log a bit more info but still keep it compact
        console.log(`[ERROR] ${context}: ${error.message || error}`);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gif')
        .setDescription('Get a random GIF based on a tag')
        .addStringOption(option => 
            option.setName('tag')
                .setDescription('The tag to search for')
                .setRequired(true)),
    category: CATEGORIES.FUN,
    async execute(interaction) {
        let responded = false;
        
        try {
            // Try to defer, but don't fail if we can't
            try {
                await interaction.deferReply();
            } catch (deferError) {
                // Just log and continue - we'll handle response differently
                handleError(deferError, 'GIF deferral failed');
                responded = true;
            }
            
            const tag = interaction.options.getString('tag');
            console.log(`[INFO] GIF search for: "${tag}" by ${interaction.user.tag}`);
            
            // NSFW CHECK
            if (containsNSFWTerms(tag)) {
                console.log(`[INFO] Blocked NSFW tag: "${tag}"`);
                
                const reactionGif = getRandomReactionGif();
                const embed = createEmbed({
                    title: 'Naughty Naughty!',
                    description: `Sorry, I can't search for that kind of content! Please keep your searches appropriate.`,
                    image: reactionGif,
                    footer: `${BOT_NAME} • Keep it clean!`,
                    timestamp: true
                });
                
                // Try to send response based on interaction state
                await safeReply(interaction, { embeds: [embed] }, responded);
                return;
            }
            
            // SAFE CONTENT SEARCH
            const sanitizedTag = encodeURIComponent(tag.trim());
            
            const response = await axios.get('https://tenor.googleapis.com/v2/search', {
                params: {
                    key: TENOR_API_KEY,
                    q: sanitizedTag,
                    random: true,
                    limit: 1,
                    contentfilter: 'low' // Strictest filter
                }
            });
            
            if (response.data && response.data.results && response.data.results.length > 0) {
                const gifData = response.data.results[0];
                const gifUrl = gifData.media_formats.gif.url || gifData.media_formats.mediumgif.url;
                const gifId = gifData.id; // Get the GIF ID
                
                const embed = createEmbed({
                    title: `Random GIF for: ${tag}`,
                    image: gifUrl,
                    footer: `Powered by Tenor • GIF ID: ${gifId} • ${BOT_NAME}`,
                    timestamp: true,
                    url: gifData.url
                });
                
                await safeReply(interaction, { embeds: [embed] }, responded);
            } else {
                const embed = createEmbed({
                    title: 'No GIFs Found',
                    description: `I couldn't find any GIFs for "${tag}". Try a different tag!`,
                    footer: `${BOT_NAME} GIF Search`,
                    timestamp: true
                });
                
                await safeReply(interaction, { embeds: [embed] }, responded);
            }
        } catch (error) {
            handleError(error, 'GIF command');
            
            try {
                const embed = createEmbed({
                    title: 'Error',
                    description: 'There was an error fetching your GIF. Please try again later.',
                    footer: `${BOT_NAME} GIF Search`,
                    timestamp: true
                });
                
                await safeReply(interaction, { embeds: [embed] }, responded);
            } catch (responseError) {
                handleError(responseError, 'GIF error response');
            }
        }
    }
};

/**
 * Safely responds to an interaction based on its current state
 * @param {Interaction} interaction - The interaction to respond to
 * @param {Object} responseData - The data to send
 * @param {boolean} alreadyResponded - Whether we've already tried to respond
 */
async function safeReply(interaction, responseData, alreadyResponded) {
    try {
        // If we already responded or failed to defer, try to followUp
        if (alreadyResponded) {
            await interaction.followUp(responseData);
        }
        // If we successfully deferred earlier, edit the reply
        else if (interaction.deferred) {
            await interaction.editReply(responseData);
        }
        // If we didn't defer but haven't responded, send a new reply
        else {
            await interaction.reply(responseData);
        }
    } catch (error) {
        // Just log without rethrowing - prevent error cascades
        handleError(error, 'Safe reply failed');
    }
} 