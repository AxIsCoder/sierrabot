const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bans a member from the server')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for banning')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('delete_days')
                .setDescription('Number of days of messages to delete (0-7)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(7))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    category: CATEGORIES.MODERATION,
    async execute(interaction) {
        // Get command options
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteMessageDays = interaction.options.getInteger('delete_days') || 1;
        
        // Prevent self-ban
        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ You cannot ban yourself!',
                ephemeral: true
            });
        }
        
        // Prevent bot-ban
        if (targetUser.id === interaction.client.user.id) {
            return interaction.reply({
                content: '❌ You cannot ban me with my own command!',
                ephemeral: true
            });
        }
        
        try {
            // Get the member to ban
            const member = await interaction.guild.members.fetch(targetUser.id);
            
            // Check if member can be banned
            if (!member.bannable) {
                return interaction.reply({
                    content: '❌ I cannot ban this user! They may have higher permissions than me.',
                    ephemeral: true
                });
            }
            
            // Check if the command user has a higher role than the target
            if (interaction.member.roles.highest.position <= member.roles.highest.position) {
                return interaction.reply({
                    content: '❌ You cannot ban this user as they have the same or higher role than you.',
                    ephemeral: true
                });
            }
            
            // Try to DM the banned user first before banning
            try {
                const dmEmbed = createEmbed({
                    title: `You've been banned from ${interaction.guild.name}`,
                    description: `You have been banned by <@${interaction.user.id}>.`,
                    fields: [
                        {
                            name: 'Reason',
                            value: reason
                        }
                    ],
                    footer: 'Sierra Bot • Made with ❤️ by Axody',
                    timestamp: true
                });
                
                await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
                    // Silently fail if DM cannot be sent
                });
            } catch (error) {
                // Ignore DM errors
            }
            
            // Ban the member
            await member.ban({ deleteMessageDays, reason });
            
            // Create success embed
            const embed = createEmbed({
                title: '🔨 Member Banned',
                description: `**${targetUser.tag}** has been banned from the server.`,
                thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
                fields: [
                    {
                        name: 'User',
                        value: `<@${targetUser.id}> (${targetUser.id})`,
                        inline: true
                    },
                    {
                        name: 'Moderator',
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    },
                    {
                        name: 'Message Deletion',
                        value: `${deleteMessageDays} day(s)`,
                        inline: true
                    },
                    {
                        name: 'Reason',
                        value: reason
                    }
                ],
                footer: 'Sierra Bot • Made with ❤️ by Axody',
                timestamp: true
            });
            
            // Send success message
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error in ban command:', error);
            return interaction.reply({
                content: '❌ There was an error trying to ban this user.',
                ephemeral: true
            });
        }
    }
}; 