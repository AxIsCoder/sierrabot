const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { getRandomGif, downloadGif, cleanupTempFiles } = require('../../utils/tenorApiHandler');
const { CATEGORIES } = require('../../utils/constants');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pat')
        .setDescription('Pat someone on the head with a GIF from Tenor')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to pat')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('message')
                .setDescription('Add a message with your pat')
                .setRequired(false)),
    category: CATEGORIES.FUN,
    async execute(interaction) {
        try {
            // Get command options
            const targetUser = interaction.options.getUser('user');
            const message = interaction.options.getString('message');
            
            // Defer reply as API calls might take time
            await interaction.deferReply();
            
            // Check if trying to pat self
            if (targetUser.id === interaction.user.id) {
                return interaction.editReply({
                    content: "You can't pat yourself, but I'll pat you instead! ✋"
                });
            }
            
            // Check if trying to pat the bot
            if (targetUser.id === interaction.client.user.id) {
                return interaction.editReply({
                    content: "Aww, thanks for the pat! *happy bot noises* ✨"
                });
            }
            
            try {
                // Get a random pat GIF from Tenor
                const gifResult = await getRandomGif('anime head pat');
                
                // Download the GIF
                const gifPath = await downloadGif(gifResult.url);
                
                // Clean up old temp files
                cleanupTempFiles(path.join(__dirname, '..', '..', 'assets', 'images', 'temp'));
                
                // Create attachment from downloaded GIF
                const attachment = new AttachmentBuilder(gifPath, { name: 'pat.gif' });
                
                // Create embed description based on message
                let description = `**${interaction.user.username}** patted **${targetUser.username}** on the head! ✋`;
                if (message) {
                    description += `\n\n**Message:** ${message}`;
                }
                
                // Create the embed
                const embed = createEmbed({
                    title: '✋ PAT PAT!',
                    description: description,
                    image: 'attachment://pat.gif',
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
                    content: `**${interaction.user.username}** patted **${targetUser.username}** on the head! ✋${message ? `\n\nMessage: ${message}` : ''}\n\n(GIF unavailable: Tenor API error)`
                });
            }
        } catch (error) {
            console.error('Error in pat command:', error);
            
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