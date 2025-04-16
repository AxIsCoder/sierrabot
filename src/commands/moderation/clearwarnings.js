const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');
const { clearWarnings, getWarnings } = require('../../utils/warningManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearwarnings')
        .setDescription('Clear all warnings from a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to clear warnings from')
                .setRequired(true))
        .addBooleanOption(option => 
            option.setName('silent')
                .setDescription('Whether to silently clear the warnings')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    category: CATEGORIES.MODERATION,
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const silent = interaction.options.getBoolean('silent') || false;
        
        await interaction.deferReply({ ephemeral: silent });
        
        try {
            // First check if the user has any warnings
            const warnings = await getWarnings(interaction.guild.id, targetUser.id);
            
            if (!warnings || warnings.length === 0) {
                return await interaction.editReply({
                    content: `${targetUser.tag} has no warnings to clear.`
                });
            }
            
            const warningCount = warnings.length;
            
            // Clear all warnings for the user
            await clearWarnings(interaction.guild.id, targetUser.id);
            
            // Create success embed
            const embed = createEmbed({
                title: 'Warnings Cleared',
                description: `Successfully cleared all warnings for ${targetUser.tag} (<@${targetUser.id}>).`,
                fields: [
                    {
                        name: 'Number of Warnings Cleared',
                        value: `${warningCount}`,
                        inline: true
                    },
                    {
                        name: 'Cleared By',
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    }
                ],
                timestamp: true
            });
            
            await interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            console.error('Error in clearwarnings command:', error);
            await interaction.editReply({
                content: 'There was an error while trying to clear warnings. Please try again later.'
            });
        }
    }
}; 