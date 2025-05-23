const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { getTopUsers } = require('../../utils/messageTracker');
const { CATEGORIES, BOT_NAME } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View message leaderboard for this server')
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of users to show (default: 10, max: 25)')
                .setRequired(false)),
    category: CATEGORIES.FUN,
    async execute(interaction) {
        try {
            // Get current guild ID
            const guildId = interaction.guild?.id;
            if (!guildId) {
                return await interaction.reply({
                    content: "This command can only be used in a server.",
                    ephemeral: true
                });
            }
            
            // Get limit from options (default 10, max 25)
            let limit = interaction.options.getInteger('limit') || 10;
            limit = Math.max(1, Math.min(25, limit)); // Constrain between 1 and 25
            
            // Get top users for this guild
            const topUsers = getTopUsers(guildId, limit);
            
            if (topUsers.length === 0) {
                return await interaction.reply({
                    content: "No message statistics available yet.",
                    ephemeral: true
                });
            }
            
            // Format the leaderboard list
            const leaderboardList = topUsers.map((user, index) => {
                // Medal emojis for top 3
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                return `${medal} <@${user.id}> (${user.username}): ${user.messageCount} messages`;
            }).join('\n');
            
            // Create embed for the leaderboard
            const embed = createEmbed({
                title: '📊 Message Leaderboard',
                description: `Top ${topUsers.length} active members in this server:\n\n${leaderboardList}`,
                footer: `${BOT_NAME} • Message Statistics`,
                timestamp: true
            });
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[ERROR] Error in leaderboard command:', error);
            await interaction.reply({
                content: "There was an error processing your request.",
                ephemeral: true
            }).catch(console.error);
        }
    }
}; 