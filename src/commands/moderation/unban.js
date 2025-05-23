const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unbans a user from the server')
        .addStringOption(option => 
            option.setName('user_id')
                .setDescription('The ID of the user to unban')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for unbanning')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    category: CATEGORIES.MODERATION,
    async execute(interaction) {
        // Get command options
        const userId = interaction.options.getString('user_id');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        // Validate user ID format (simple check for Discord's snowflake IDs)
        if (!/^\d{17,20}$/.test(userId)) {
            return interaction.reply({
                content: '❌ Invalid user ID format. Please provide a valid Discord user ID.',
                ephemeral: true
            });
        }
        
        try {
            // Fetch the ban list to check if the user is banned
            const bans = await interaction.guild.bans.fetch();
            const ban = bans.find(ban => ban.user.id === userId);
            
            if (!ban) {
                return interaction.reply({
                    content: '❌ This user is not banned from this server.',
                    ephemeral: true
                });
            }
            
            // Unban the user
            await interaction.guild.members.unban(userId, reason);
            
            // Try to fetch the user for the embed
            let unbannedUser;
            try {
                unbannedUser = await interaction.client.users.fetch(userId);
            } catch (error) {
                // If we can't fetch the user, just use what we know from the ban entry
                unbannedUser = ban.user;
            }
            
            // Create success embed
            const embed = createEmbed({
                title: '🔓 User Unbanned',
                description: `**${unbannedUser.tag || 'Unknown User'}** has been unbanned from the server.`,
                thumbnail: unbannedUser.displayAvatarURL ? unbannedUser.displayAvatarURL({ dynamic: true }) : null,
                fields: [
                    {
                        name: 'User',
                        value: `<@${userId}> (${userId})`,
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
                    },
                    {
                        name: 'Original Ban Reason',
                        value: ban.reason || 'No reason provided',
                        inline: false
                    }
                ],
                footer: 'Sierra Bot • Made with ❤️ by Axody',
                timestamp: true
            });
            
            // Send success message
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error in unban command:', error);
            return interaction.reply({
                content: '❌ There was an error trying to unban this user.',
                ephemeral: true
            });
        }
    }
}; 