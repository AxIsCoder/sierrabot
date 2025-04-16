const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { getRandomGif, downloadGif, cleanupTempFiles } = require('../../utils/tenorApiHandler');
const { CATEGORIES } = require('../../utils/constants');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hug')
        .setDescription('Give someone a warm hug with a GIF from Tenor')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to hug')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('message')
                .setDescription('Add a sweet message with your hug')
                .setRequired(false)),
    category: CATEGORIES.FUN,
    async execute(interaction) {
        try {
            // Get command options
            const targetUser = interaction.options.getUser('user');
            const message = interaction.options.getString('message');
            
            // Defer reply as API calls might take time
            await interaction.deferReply();
            
            // Check if trying to hug self
            if (targetUser.id === interaction.user.id) {
                return interaction.editReply({
                    content: "Aww, do you need a hug? Here's one from me! 🤗"
                });
            }
            
            try {
                // Get a random hug GIF from Tenor
                const gifResult = await getRandomGif('anime hug');
                
                // Download the GIF
                const gifPath = await downloadGif(gifResult.url);
                
                // Clean up old temp files
                cleanupTempFiles(path.join(__dirname, '..', '..', 'assets', 'images', 'temp'));
                
                // Create attachment from downloaded GIF
                const attachment = new AttachmentBuilder(gifPath, { name: 'hug.gif' });
                
                // Create embed description based on message
                let description = `**${interaction.user.username}** gave **${targetUser.username}** a warm hug! 🤗`;
                if (message) {
                    description += `\n\n**Message:** ${message}`;
                }
                
                // Create the embed
                const embed = createEmbed({
                    title: '🤗 HUG!',
                    description: description,
                    image: 'attachment://hug.gif',
                    footer: `Sierra Bot • Tenor GIF ID: ${gifResult.id}`,
                    timestamp: true
                });
                
                // Send the response with the GIF
                await interaction.editReply({
                    embeds: [embed],
                    files: [attachment]
                });
            } catch (apiError) {
                console.error('Error with Tenor API:', apiError);
                
                // Fallback with just text if the API fails
                await interaction.editReply({
                    content: `**${interaction.user.username}** gave **${targetUser.username}** a warm hug! 🤗${message ? `\n\nMessage: ${message}` : ''}\n\n(GIF unavailable: Tenor API error)`
                });
            }
        } catch (error) {
            console.error('Error in hug command:', error);
            
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