const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');
const { getWarnings } = require('../../utils/warningManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View warnings for a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to check warnings for')
                .setRequired(true))
        .addBooleanOption(option => 
            option.setName('private')
                .setDescription('Whether to show the warnings only to you')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    category: CATEGORIES.MODERATION,
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: interaction.options.getBoolean('private') || false });
        
        try {
            const targetUser = interaction.options.getUser('user');
            
            // Get the warnings
            const warnings = await getWarnings(interaction.guild.id, targetUser.id);
            
            if (warnings.length === 0) {
                return await interaction.editReply({
                    content: `${targetUser.tag} has no warnings.`
                });
            }
            
            // Format the warnings
            const warningList = warnings.map((warning, index) => {
                const date = new Date(warning.timestamp);
                const formattedDate = `<t:${Math.floor(date.getTime() / 1000)}:F>`;
                const moderator = warning.moderatorId ? `<@${warning.moderatorId}>` : 'Unknown Moderator';
                
                return `**Warning ${index + 1}** - ID: ${warning.id}\n📅 ${formattedDate}\n👮 Moderator: ${moderator}\n📝 Reason: ${warning.reason}`;
            }).join('\n\n');
            
            // Create the embed
            const embed = createEmbed({
                title: `Warnings for ${targetUser.tag}`,
                description: `${targetUser} has ${warnings.length} warning(s):`,
                fields: [
                    {
                        name: 'Warning History',
                        value: warningList,
                        inline: false
                    }
                ],
                thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
                footer: `User ID: ${targetUser.id}`,
                timestamp: true
            });
            
            await interaction.editReply({
                embeds: [embed]
            });
        } catch (error) {
            console.error('Error in warnings command:', error);
            await interaction.editReply({
                content: 'There was an error while trying to fetch the warnings. Please try again later.'
            });
        }
    }
}; 