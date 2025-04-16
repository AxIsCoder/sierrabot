const { EmbedBuilder } = require('discord.js');
require('dotenv').config();

/**
 * Creates a Discord-themed embed that blends with Discord's dark mode interface
 * @param {Object} options - Embed options
 * @param {string} options.title - Embed title
 * @param {string} options.description - Embed description
 * @param {Object[]} options.fields - Array of fields to add to the embed
 * @param {string} options.thumbnail - URL for thumbnail image
 * @param {string} options.image - URL for main image
 * @param {string} options.footer - Footer text
 * @param {string} options.footerIcon - Footer icon URL
 * @param {string} options.author - Author name
 * @param {string} options.authorIcon - Author icon URL
 * @param {string} options.authorUrl - Author URL
 * @param {string} options.url - URL for title
 * @param {string} options.timestamp - Whether to add timestamp (true/false)
 * @returns {EmbedBuilder} - Discord.js embed object
 */
function createEmbed(options = {}) {
    // Default to Discord dark theme color if not specified in .env
    const themeColor = process.env.EMBED_COLOR ? `#${process.env.EMBED_COLOR}` : '#2F3136';
    
    // Create base embed with theme color
    const embed = new EmbedBuilder().setColor(themeColor);
    
    // Add title if provided
    if (options.title) embed.setTitle(options.title);
    
    // Add description if provided
    if (options.description) embed.setDescription(options.description);
    
    // Add fields if provided
    if (options.fields && Array.isArray(options.fields)) {
        options.fields.forEach(field => {
            if (field.name && field.value) {
                embed.addFields({ 
                    name: field.name, 
                    value: field.value, 
                    inline: field.inline === undefined ? false : field.inline 
                });
            }
        });
    }
    
    // Add thumbnail if provided
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    
    // Add image if provided
    if (options.image) embed.setImage(options.image);
    
    // Add footer if provided
    if (options.footer) {
        embed.setFooter({ 
            text: options.footer, 
            iconURL: options.footerIcon || null 
        });
    }
    
    // Add author if provided
    if (options.author) {
        embed.setAuthor({
            name: options.author,
            iconURL: options.authorIcon || null,
            url: options.authorUrl || null
        });
    }
    
    // Add URL if provided
    if (options.url) embed.setURL(options.url);
    
    // Add timestamp if requested
    if (options.timestamp) embed.setTimestamp();
    
    return embed;
}

module.exports = { createEmbed }; 