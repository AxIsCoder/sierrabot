const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { getUserStats, getTopUsers } = require('../../utils/messageTracker');
const { CATEGORIES, BOT_NAME } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('messages')
        .setDescription('Check message statistics for a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check stats for (defaults to yourself)')
                .setRequired(false)),
    category: CATEGORIES.LEVELING,
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
            
            // Get target user (default to command user)
            const targetUser = interaction.options.getUser('user') || interaction.user;
            
            // Get user stats
            const stats = getUserStats(targetUser.id, guildId);
            
            if (!stats || stats.guildMessages === 0) {
                return await interaction.reply({
                    content: `No message statistics available for ${targetUser.username}.`,
                    ephemeral: true
                });
            }
            
            // Get top users to find rank
            const allUsers = getTopUsers(guildId, 1000); // Get all users
            const userRank = allUsers.findIndex(user => user.id === targetUser.id) + 1;
            
            // Format last message time
            const lastMessageTime = stats.lastMessage 
                ? `<t:${Math.floor(stats.lastMessage / 1000)}:R>`
                : 'Never';
            
            // Create embed for user stats
            const embed = createEmbed({
                title: `📊 Message Statistics for ${targetUser.username}`,
                description: `Here are the message statistics for <@${targetUser.id}>:`,
                thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
                fields: [
                    {
                        name: 'Server Rank',
                        value: userRank > 0 ? `#${userRank}` : 'Not ranked',
                        inline: true
                    },
                    {
                        name: 'Messages',
                        value: stats.guildMessages.toString(),
                        inline: true
                    },
                    {
                        name: 'Last Active',
                        value: lastMessageTime,
                        inline: true
                    }
                ],
                footer: `${BOT_NAME} • Message Statistics`,
                timestamp: true
            });
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[ERROR] Error in messages command:', error);
            await interaction.reply({
                content: "There was an error retrieving message statistics.",
                ephemeral: true
            }).catch(console.error);
        }
    }
}; 