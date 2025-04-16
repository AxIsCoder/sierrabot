const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');
const { getWarnings, addWarning } = require('../../utils/warningManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user for breaking server rules')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to warn')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the warning')
                .setRequired(true))
        .addBooleanOption(option => 
            option.setName('silent')
                .setDescription('Whether to send the warning only to the user (not visible in channel)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    category: CATEGORIES.MODERATION,
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: interaction.options.getBoolean('silent') || false });
        
        try {
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            const silent = interaction.options.getBoolean('silent') || false;
            
            // Check if the user is trying to warn themselves
            if (targetUser.id === interaction.user.id) {
                return await interaction.editReply({
                    content: 'You cannot warn yourself.'
                });
            }
            
            // Check if the user is trying to warn a bot
            if (targetUser.bot) {
                return await interaction.editReply({
                    content: 'You cannot warn a bot.'
                });
            }
            
            // Get the member from the guild
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            
            // Check if the member exists
            if (!member) {
                return await interaction.editReply({
                    content: 'This user is not a member of this server.'
                });
            }
            
            // Check if the member has a higher role than the moderator
            if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
                return await interaction.editReply({
                    content: 'You cannot warn someone with a higher or equal role to you.'
                });
            }
            
            // Add the warning
            const warning = await addWarning(interaction.guild.id, targetUser.id, {
                moderatorId: interaction.user.id,
                reason: reason,
                timestamp: new Date().toISOString()
            });
            
            // Create warning embed for the channel
            const warnEmbed = createEmbed({
                title: 'User Warned',
                description: `${targetUser} has been warned by ${interaction.user}.`,
                fields: [
                    {
                        name: 'Reason',
                        value: reason,
                        inline: false
                    },
                    {
                        name: 'Warning ID',
                        value: warning.id,
                        inline: true
                    },
                    {
                        name: 'Total Warnings',
                        value: warning.count.toString(),
                        inline: true
                    }
                ],
                thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
                footer: `User ID: ${targetUser.id}`,
                timestamp: true
            });
            
            // Create warning embed for the user
            const userWarnEmbed = createEmbed({
                title: `Warning from ${interaction.guild.name}`,
                description: `You have been warned by ${interaction.user}.`,
                fields: [
                    {
                        name: 'Reason',
                        value: reason,
                        inline: false
                    },
                    {
                        name: 'Warning ID',
                        value: warning.id,
                        inline: true
                    },
                    {
                        name: 'Total Warnings',
                        value: warning.count.toString(),
                        inline: true
                    }
                ],
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                footer: 'Please make sure to follow the server rules to avoid further consequences.',
                timestamp: true
            });
            
            // Send the warning to the user
            try {
                await targetUser.send({ embeds: [userWarnEmbed] });
            } catch (error) {
                console.error(`Failed to DM user ${targetUser.tag} about warning:`, error);
                // Add a field mentioning that the DM failed
                warnEmbed.addFields({
                    name: 'Note',
                    value: 'Failed to DM the user about this warning.',
                    inline: false
                });
            }
            
            // Send the response in the channel
            await interaction.editReply({
                embeds: [warnEmbed]
            });
            
            // Check if any automated actions need to be taken based on warning count
            if (warning.count >= 3) {
                // Add a suggestion for potential action
                await interaction.followUp({
                    content: `**Suggestion:** ${targetUser.tag} now has ${warning.count} warnings. Consider taking further moderation action like a mute or temporary ban.`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in warn command:', error);
            await interaction.editReply({
                content: 'There was an error while trying to warn the user. Please try again later.'
            });
        }
    }
}; 