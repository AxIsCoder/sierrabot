const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Shows the bot\'s latency and API response time'),
    category: CATEGORIES.UTILITY,
    async execute(interaction) {
        // Send initial message
        const sent = await interaction.reply({ 
            content: '🏓 Pinging...', 
            fetchReply: true 
        });
        
        // Calculate latency
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);
        
        // Create status indicators based on ping
        const getStatus = (ms) => {
            if (ms < 200) return '🟢 Excellent';
            if (ms < 400) return '🟡 Good';
            if (ms < 700) return '🟠 Moderate';
            return '🔴 Poor';
        };
        
        // Create the embed
        const embed = createEmbed({
            title: '🏓 Pong!',
            description: `Here's the current latency information:`,
            fields: [
                { 
                    name: '📡 Bot Latency', 
                    value: `${latency}ms (${getStatus(latency)})`, 
                    inline: true 
                },
                { 
                    name: '⚡ API Latency', 
                    value: `${apiLatency}ms (${getStatus(apiLatency)})`, 
                    inline: true 
                }
            ],
            footer: 'Sierra Bot • Made with ❤️ by Axody',
            timestamp: true
        });
        
        // Edit the reply with the embed
        await interaction.editReply({ content: null, embeds: [embed] });
    },
}; 