const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createProfileCard } = require('../../utils/imageManipulator');
const { getUserStats, getTopUsers } = require('../../utils/messageTracker');
const { CATEGORIES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Generate a visual profile card with your stats')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to generate a profile card for (default: yourself)')
                .setRequired(false)),
    category: CATEGORIES.FUN,
    async execute(interaction) {
        try {
            // Defer reply as image processing might take time
            await interaction.deferReply();
            
            // Get current guild ID
            const guildId = interaction.guild?.id;
            if (!guildId) {
                return await interaction.editReply({
                    content: "This command can only be used in a server."
                });
            }
            
            // Get target user (default to command user)
            const targetUser = interaction.options.getUser('user') || interaction.user;
            
            // Get user stats from message tracker
            const stats = getUserStats(targetUser.id, guildId);
            
            if (!stats || stats.guildMessages === 0) {
                return await interaction.editReply({
                    content: `No message statistics available for ${targetUser.username}.`
                });
            }
            
            // Get top users to find rank
            const allUsers = getTopUsers(guildId, 1000); // Get all users
            const userRank = allUsers.findIndex(user => user.id === targetUser.id) + 1;
            
            // Format last message time
            const lastMessageDate = new Date(stats.lastMessage);
            const lastActive = lastMessageDate.toLocaleDateString();
            
            // Get member join date if available
            let joinedDate = '';
            try {
                const member = await interaction.guild.members.fetch(targetUser.id);
                if (member) {
                    joinedDate = member.joinedAt.toLocaleDateString();
                }
            } catch (err) {
                // If we can't get member info, continue without it
                console.error('Error fetching member:', err);
            }
            
            // User data for profile card
            const userData = {
                username: targetUser.username,
                rank: userRank,
                messages: stats.guildMessages,
                joined: joinedDate
            };
            
            try {
                // Get user's avatar URL in larger size
                const avatarURL = targetUser.displayAvatarURL({ 
                    extension: 'png', 
                    forceStatic: true,
                    size: 512 
                });
                
                if (!avatarURL) {
                    return await interaction.editReply({
                        content: '❌ Could not retrieve a valid avatar for this user.'
                    });
                }
                
                // Generate the profile card
                const result = await createProfileCard(avatarURL, userData);
                
                // Create attachment from profile card
                const attachment = new AttachmentBuilder(result.path, { name: 'profile.png' });
                
                // Send the response with the profile card
                await interaction.editReply({
                    files: [attachment]
                });
            } catch (imageError) {
                console.error('Error creating profile card:', imageError);
                
                // Fallback with text if the processing fails
                await interaction.editReply({
                    content: `**${targetUser.username}'s Profile**\n` +
                             `Rank: #${userRank}\n` +
                             `Messages: ${stats.guildMessages}\n` +
                             (joinedDate ? `Joined: ${joinedDate}\n` : '') +
                             `Last Active: ${lastActive}`
                });
            }
        } catch (error) {
            console.error('Error in profile command:', error);
            
            // If already deferred, edit the reply
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ There was an error generating the profile card. Please try again later.'
                });
            } else {
                await interaction.reply({
                    content: '❌ There was an error generating the profile card. Please try again later.',
                    ephemeral: true
                });
            }
        }
    }
}; 