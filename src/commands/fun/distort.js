const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { distortImage } = require('../../utils/imageManipulator');
const { CATEGORIES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('distort')
        .setDescription('Distort a user\'s profile picture with various effects')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user whose profile picture to distort (default: yourself)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('effect')
                .setDescription('The distortion effect to apply')
                .setRequired(false)
                .addChoices(
                    { name: 'Random', value: 'random' },
                    { name: 'Bulge', value: 'bulge' },
                    { name: 'Pixelate', value: 'pixelate' },
                    { name: 'Blur', value: 'blur' },
                    { name: 'Invert', value: 'invert' },
                    { name: 'Glitch', value: 'glitch' },
                    { name: 'Deep Fry', value: 'deepfry' }
                )),
    category: CATEGORIES.FUN,
    async execute(interaction) {
        try {
            // Defer reply as image processing might take time
            await interaction.deferReply();
            
            // Get options (default to user's own avatar if no user specified)
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const effect = interaction.options.getString('effect') || 'random';
            
            try {
                // Get user's avatar URL in larger size
                const avatarURL = targetUser.displayAvatarURL({ 
                    extension: 'png', 
                    forceStatic: true,
                    size: 1024 
                });
                
                // Process the image
                const result = await distortImage(avatarURL, effect);
                
                // Create attachment from distorted image
                const attachment = new AttachmentBuilder(result.path, { name: 'distorted.png' });
                
                // Create title based on effect
                let title;
                switch (result.effect) {
                    case 'bulge': title = '🔍 Bulged!'; break;
                    case 'pixelate': title = '🧩 Pixelated!'; break;
                    case 'blur': title = '👓 Blurred!'; break;
                    case 'invert': title = '🔄 Inverted!'; break;
                    case 'glitch': title = '⚡ Glitched!'; break;
                    case 'deepfry': title = '🔥 Deep Fried!'; break;
                    default: title = '🎭 Distorted!';
                }
                
                // Create the embed
                const embed = createEmbed({
                    title: title,
                    description: `**${interaction.user.username}** distorted **${targetUser.username}**'s profile picture!`,
                    image: 'attachment://distorted.png',
                    footer: `Sierra Bot • Effect: ${result.effect}`,
                    timestamp: true
                });
                
                // Send the response with the distorted image
                await interaction.editReply({
                    embeds: [embed],
                    files: [attachment]
                });
            } catch (imageError) {
                console.error('Error processing image:', imageError);
                
                // Fallback with text if the processing fails
                await interaction.editReply({
                    content: '❌ There was an error processing the image. The profile picture might be in an unsupported format.'
                });
            }
        } catch (error) {
            console.error('Error in distort command:', error);
            
            // If already deferred, edit the reply
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ There was an error executing this command. Please try again later.'
                });
            } else {
                await interaction.reply({
                    content: '❌ There was an error executing this command. Please try again later.',
                    ephemeral: true
                });
            }
        }
    }
}; 