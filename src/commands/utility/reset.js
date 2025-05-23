const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { resetGuildStats } = require('../../utils/messageTracker');
const { CATEGORIES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset various server statistics (Admin only)')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The type of statistics to reset')
                .setRequired(true)
                .addChoices(
                    { name: 'Message Leaderboard', value: 'leaderboard' }
                    // Future reset options can be added here
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    category: CATEGORIES.UTILITY,
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
            
            // Check if user has admin permissions
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({
                    content: "You need Administrator permission to use this command.",
                    ephemeral: true
                });
            }
            
            // Get the type of reset to perform
            const resetType = interaction.options.getString('type');
            
            switch (resetType) {
                case 'leaderboard':
                    // Reset message statistics for this guild
                    resetGuildStats(guildId);
                    
                    await interaction.reply({
                        content: "✅ Message statistics for this server have been reset.",
                        ephemeral: true
                    });
                    break;
                    
                default:
                    await interaction.reply({
                        content: "Unknown reset type.",
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('[ERROR] Error in reset command:', error);
            await interaction.reply({
                content: "There was an error processing your request.",
                ephemeral: true
            }).catch(console.error);
        }
    }
}; 