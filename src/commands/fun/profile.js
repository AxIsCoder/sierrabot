const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createProfileCard } = require('../../utils/imageManipulator');
const { getUserStats, getTopUsers } = require('../../utils/messageTracker');
const { CATEGORIES } = require('../../utils/constants');
const { getUserLevel, getXpForNextLevel } = require('../../utils/levelingUtils'); // Import leveling utilities

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
            
            // Get top users to find rank (for message rank)
            const allMessageUsers = getTopUsers(guildId, 1000); // Get all users for message rank
            const messageRank = allMessageUsers.findIndex(user => user.id === targetUser.id) + 1;

            // Get user leveling data
            const userLevelData = getUserLevel(guildId, targetUser.id);
            const { xp, level } = userLevelData;
            const xpNeededForNextLevel = getXpForNextLevel(level);

            // Calculate progress for the level bar
            const levelProgress = xp / xpNeededForNextLevel;
            const progressBarLength = 20; // Length of the text-based progress bar
            const filledBar = '█'.repeat(Math.round(levelProgress * progressBarLength));
            const emptyBar = ' '.repeat(progressBarLength - filledBar.length);
            const levelBar = `[${filledBar}${emptyBar}] ${Math.round(levelProgress * 100)}%`;
            
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
            
            // User data for profile card (you would integrate level data here for the image version)
            const userData = {
                username: targetUser.username,
                messageRank: messageRank, // Renamed from rank to messageRank for clarity
                messages: stats.guildMessages,
                joined: joinedDate,
                level: level, // Add level data
                xp: xp, // Add xp data
                xpNeeded: xpNeededForNextLevel // Add xp needed data
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
                
                // Generate the profile card (you would need to modify createProfileCard to accept and use level data for the bar)
                 const result = await createProfileCard(avatarURL, userData);
                
                // For now, we'll use the text fallback with the level bar
                 // const fallbackText =
                 //    `**${targetUser.tag}'s Profile**\n\n` +
                 //    `Level: **${level}**\n` +
                 //    `XP: **${xp}** / **${xpNeeded}**\n` +
                 //    `Progress: ${levelBar}\n\n` +
                 //    `Message Rank: #${messageRank}\n` +
                 //    `Messages Sent: ${stats.guildMessages}\n` +
                 //    (joinedDate ? `Joined Server: ${joinedDate}\n` : '') +
                 //    `Last Active: ${lastActive}`;

                 // await interaction.editReply({ content: fallbackText }); // Comment out this line

                // If you modify createProfileCard, uncomment the following and comment out the fallback text block:
                 const attachment = new AttachmentBuilder(result.path, { name: 'profile.png' }); // Uncomment this line
                 await interaction.editReply({ files: [attachment] }); // Uncomment this line

            } catch (imageError) {
                console.error('Error creating profile card or fallback:', imageError); // Log fallback error as well
                
                // Final fallback if everything fails
                await interaction.editReply({
                    content: '❌ An error occurred while generating the profile information. Please try again later.'
                });
            }
        } catch (error) {
            console.error('Error in profile command:', error);
            
            // If already deferred, edit the reply
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ There was an error processing your profile request. Please try again later.'
                });
            } else {
                await interaction.reply({
                    content: '❌ There was an error processing your profile request. Please try again later.',
                    ephemeral: true
                });
            }
        }
    }
}; 