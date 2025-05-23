const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Show a user\'s avatar in full size')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user whose avatar to show (default: yourself)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('server_avatar')
                .setDescription('Show server-specific avatar instead of global avatar')
                .setRequired(false)),
    category: CATEGORIES.INFO,
    async execute(interaction) {
        try {
            // Get the target user (defaults to the command user)
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const useServerAvatar = interaction.options.getBoolean('server_avatar') || false;
            
            // Get the member object if server avatar is requested
            let memberAvatar = null;
            if (useServerAvatar) {
                try {
                    const member = await interaction.guild.members.fetch(targetUser.id);
                    if (member.avatar) {
                        memberAvatar = member.displayAvatarURL({ size: 4096, dynamic: true });
                    }
                } catch (error) {
                    console.error('Error fetching member:', error);
                }
            }
            
            // Get the global avatar URL
            const globalAvatar = targetUser.displayAvatarURL({ size: 4096, dynamic: true });
            
            // Use server avatar if available and requested, otherwise use global avatar
            const avatarUrl = (useServerAvatar && memberAvatar) ? memberAvatar : globalAvatar;
            
            // Get static format URLs for buttons
            const avatarUrlPNG = avatarUrl.replace(/\.(gif|jpg|jpeg|webp)(\?.*)?$/i, '.png');
            const avatarUrlJPG = avatarUrl.replace(/\.(gif|png|webp)(\?.*)?$/i, '.jpg');
            const avatarUrlWebP = avatarUrl.replace(/\.(gif|jpg|jpeg|png)(\?.*)?$/i, '.webp');
            
            // Create buttons for different formats
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('PNG')
                        .setStyle(ButtonStyle.Link)
                        .setURL(avatarUrlPNG),
                    new ButtonBuilder()
                        .setLabel('JPG')
                        .setStyle(ButtonStyle.Link)
                        .setURL(avatarUrlJPG),
                    new ButtonBuilder()
                        .setLabel('WebP')
                        .setStyle(ButtonStyle.Link)
                        .setURL(avatarUrlWebP)
                );
            
            // Add GIF button if the avatar is animated
            if (targetUser.avatar && targetUser.avatar.startsWith('a_')) {
                const avatarUrlGIF = avatarUrl.replace(/\.(jpg|jpeg|png|webp)(\?.*)?$/i, '.gif');
                
                row.addComponents(
                    new ButtonBuilder()
                        .setLabel('GIF')
                        .setStyle(ButtonStyle.Link)
                        .setURL(avatarUrlGIF)
                );
            }
            
            // Create the embed
            const embed = createEmbed({
                title: `${useServerAvatar && memberAvatar ? 'Server' : 'Global'} Avatar for ${targetUser.tag}`,
                description: memberAvatar === null && useServerAvatar ? 
                    '*This user doesn\'t have a server-specific avatar. Showing global avatar instead.*' : 
                    `Click the buttons below to open the avatar in different formats.`,
                image: avatarUrl,
                footer: 'Sierra Bot • Made with ❤️ by Axody',
                timestamp: true
            });
            
            // Send the response
            await interaction.reply({
                embeds: [embed],
                components: [row]
            });
            
        } catch (error) {
            console.error('Error in avatar command:', error);
            await interaction.reply({
                content: '❌ There was an error processing this command.',
                ephemeral: true
            });
        }
    }
}; 