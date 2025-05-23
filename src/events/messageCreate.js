const { Events } = require('discord.js');
const { trackMessage } = require('../utils/messageTracker');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        try {
            // Skip messages from bots
            if (message.author.bot) return;
            
            // Skip DM messages - we only track server messages
            if (!message.guild) return;
            
            // Track this message
            trackMessage(
                message.author.id,
                message.author.username,
                message.guild.id
            );
            
            // We're just tracking, no need to respond
        } catch (error) {
            console.error('[ERROR] Error in messageCreate event:', error);
        }
    },
}; 