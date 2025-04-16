const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');
const { removeWarning, getWarningById } = require('../../utils/warningManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removewarning')
        .setDescription('Remove a warning from a user')
        .addStringOption(option => 
            option.setName('warning_id')
                .setDescription('The ID of the warning to remove')
                .setRequired(true))
        .addBooleanOption(option => 
            option.setName('silent')
                .setDescription('Whether to silently remove the warning')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    category: CATEGORIES.MODERATION,
    async execute(interaction) {
        const warningId = interaction.options.getString('warning_id');
        const silent = interaction.options.getBoolean('silent') || false;
        
        await interaction.deferReply({ ephemeral: silent });
        
        try {
            // Get the warning first to check if it exists and who it belongs to
            const warning = await getWarningById(interaction.guild.id, warningId);
            
            if (!warning) {
                return await interaction.editReply({
                    content: `Warning with ID \`${warningId}\` not found.`
                });
            }
            
            // Try to fetch the user to include in the embed
            let user;
            try {
                user = await interaction.client.users.fetch(warning.userId);
            } catch (error) {
                console.error('Could not fetch user for warning removal:', error);
                user = { tag: 'Unknown User', id: warning.userId };
            }
            
            // Remove the warning
            await removeWarning(interaction.guild.id, warningId);
            
            // Create success embed
            const embed = createEmbed({
                title: 'Warning Removed',
                description: `Successfully removed warning with ID \`${warningId}\`.`,
                fields: [
                    {
                        name: 'User',
                        value: user.tag ? `${user.tag} (<@${user.id}>)` : `<@${user.id}>`,
                        inline: true
                    },
                    {
                        name: 'Reason for Warning',
                        value: warning.reason || 'No reason provided',
                        inline: true
                    },
                    {
                        name: 'Removed By',
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    }
                ],
                footer: `Warning ID: ${warningId}`,
                timestamp: true
            });
            
            await interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            console.error('Error in removewarning command:', error);
            await interaction.editReply({
                content: 'There was an error while trying to remove the warning. Please try again later.'
            });
        }
    }
}; 