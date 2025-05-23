const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { applyFilter } = require('../../utils/imageManipulator');
const { CATEGORIES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('Apply filters to a user\'s profile picture')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user whose profile picture to filter (default: yourself)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('filter')
                .setDescription('The filter to apply')
                .setRequired(false)
                .addChoices(
                    { name: 'Sepia', value: 'sepia' },
                    { name: 'Grayscale', value: 'grayscale' },
                    { name: 'Vintage', value: 'vintage' },
                    { name: 'Posterize', value: 'posterize' },
                    { name: 'Negative', value: 'negative' }
                )),
    category: CATEGORIES.FUN,
    async execute(interaction) {
        try {
            // Defer reply as image processing might take time
            await interaction.deferReply();
            
            // Get options (default to user's own avatar if no user specified)
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const filter = interaction.options.getString('filter') || 'sepia';
            
            try {
                // Get user's avatar URL in larger size - force PNG format
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
                
                // Process the image
                const result = await applyFilter(avatarURL, filter);
                
                // Create attachment from filtered image
                const attachment = new AttachmentBuilder(result.path, { name: 'filtered.png' });
                
                // Create title based on filter
                let title;
                switch (result.filter) {
                    case 'sepia': title = '🧡 Sepia Tone'; break;
                    case 'grayscale': title = '⚪ Grayscale'; break;
                    case 'vintage': title = '📷 Vintage'; break;
                    case 'posterize': title = '🎨 Posterized'; break;
                    case 'negative': title = '🔄 Negative'; break;
                    default: title = '🖼️ Filtered';
                }
                
                // Create the embed
                const embed = createEmbed({
                    title: title,
                    description: `**${interaction.user.username}** applied the **${result.filter}** filter to **${targetUser.username}**'s profile picture!`,
                    image: 'attachment://filtered.png',
                    footer: `Sierra Bot • Filter: ${result.filter}`,
                    timestamp: true
                });
                
                // Send the response with the filtered image
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
            console.error('Error in filter command:', error);
            
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