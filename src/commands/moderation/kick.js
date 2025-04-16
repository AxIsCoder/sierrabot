const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kicks a member from the server')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for kicking')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    category: CATEGORIES.MODERATION,
    async execute(interaction) {
        // Get command options
        const targetUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        // Prevent self-kick
        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ You cannot kick yourself!',
                ephemeral: true
            });
        }
        
        // Prevent bot-kick
        if (targetUser.id === interaction.client.user.id) {
            return interaction.reply({
                content: '❌ You cannot kick me with my own command!',
                ephemeral: true
            });
        }
        
        try {
            // Get the member to kick
            const member = await interaction.guild.members.fetch(targetUser.id);
            
            // Check if member can be kicked
            if (!member.kickable) {
                return interaction.reply({
                    content: '❌ I cannot kick this user! They may have higher permissions than me.',
                    ephemeral: true
                });
            }
            
            // Check if the command user has a higher role than the target
            if (interaction.member.roles.highest.position <= member.roles.highest.position) {
                return interaction.reply({
                    content: '❌ You cannot kick this user as they have the same or higher role than you.',
                    ephemeral: true
                });
            }
            
            // Kick the member
            await member.kick(reason);
            
            // Create success embed
            const embed = createEmbed({
                title: '👢 Member Kicked',
                description: `**${targetUser.tag}** has been kicked from the server.`,
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
                        name: 'Reason',
                        value: reason
                    }
                ],
                footer: 'Sierra Bot • Made with ❤️ by Axody',
                timestamp: true
            });
            
            // Send success message
            await interaction.reply({ embeds: [embed] });
            
            // Optional: Try to DM the kicked user
            try {
                const dmEmbed = createEmbed({
                    title: `You've been kicked from ${interaction.guild.name}`,
                    description: `You have been kicked by <@${interaction.user.id}>.`,
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
            
        } catch (error) {
            console.error('Error in kick command:', error);
            return interaction.reply({
                content: '❌ There was an error trying to kick this user.',
                ephemeral: true
            });
        }
    }
}; 