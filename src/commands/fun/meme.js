const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { createMeme } = require('../../utils/imageManipulator');
const { CATEGORIES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Create a meme with custom text')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Use a user\'s avatar as the meme base (default: yourself)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('top')
                .setDescription('Text for the top of the meme')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('bottom')
                .setDescription('Text for the bottom of the meme')
                .setRequired(false)),
    category: CATEGORIES.FUN,
    async execute(interaction) {
        try {
            // Defer reply as image processing might take time
            await interaction.deferReply();
            
            // Get options
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const topText = interaction.options.getString('top') || '';
            const bottomText = interaction.options.getString('bottom') || '';
            
            // Check if at least one text option is provided
            if (!topText && !bottomText) {
                return await interaction.editReply({
                    content: '❌ You need to provide at least one line of text for the meme (top or bottom).'
                });
            }
            
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
                const result = await createMeme(avatarURL, topText.toUpperCase(), bottomText.toUpperCase());
                
                // Create attachment from meme image
                const attachment = new AttachmentBuilder(result.path, { name: 'meme.png' });
                
                // Create the embed
                const embed = createEmbed({
                    title: '🎭 Meme Created!',
                    description: `**${interaction.user.username}** created a meme using **${targetUser.username}**'s profile picture!`,
                    image: 'attachment://meme.png',
                    footer: `Sierra Bot • Meme Generator`,
                    timestamp: true
                });
                
                // Send the response with the meme image
                await interaction.editReply({
                    embeds: [embed],
                    files: [attachment]
                });
            } catch (imageError) {
                console.error('Error creating meme:', imageError);
                
                // Fallback with text if the processing fails
                await interaction.editReply({
                    content: '❌ There was an error creating the meme. Please try again later.'
                });
            }
        } catch (error) {
            console.error('Error in meme command:', error);
            
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