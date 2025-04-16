const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { getRandomGif, downloadGif, cleanupTempFiles } = require('../../utils/tenorApiHandler');
const { CATEGORIES } = require('../../utils/constants');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poke')
        .setDescription('Poke someone with a GIF from Tenor')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to poke')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('message')
                .setDescription('Add a message with your poke')
                .setRequired(false)),
    category: CATEGORIES.FUN,
    async execute(interaction) {
        try {
            // Get command options
            const targetUser = interaction.options.getUser('user');
            const message = interaction.options.getString('message');
            
            // Defer reply as API calls might take time
            await interaction.deferReply();
            
            // Check if trying to poke self
            if (targetUser.id === interaction.user.id) {
                return interaction.editReply({
                    content: "You poke yourself... but why? 👉"
                });
            }
            
            // Check if trying to poke the bot
            if (targetUser.id === interaction.client.user.id) {
                return interaction.editReply({
                    content: "Hey! Stop poking me! I'm ticklish! 😆"
                });
            }
            
            try {
                // Get a random poke GIF from Tenor
                const gifResult = await getRandomGif('anime poke');
                
                // Download the GIF
                const gifPath = await downloadGif(gifResult.url);
                
                // Clean up old temp files
                cleanupTempFiles(path.join(__dirname, '..', '..', 'assets', 'images', 'temp'));
                
                // Create attachment from downloaded GIF
                const attachment = new AttachmentBuilder(gifPath, { name: 'poke.gif' });
                
                // Create embed description based on message
                let description = `**${interaction.user.username}** poked **${targetUser.username}**! 👉`;
                if (message) {
                    description += `\n\n**Message:** ${message}`;
                }
                
                // Create the embed
                const embed = createEmbed({
                    title: '👉 POKE!',
                    description: description,
                    image: 'attachment://poke.gif',
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
                    content: `**${interaction.user.username}** poked **${targetUser.username}**! 👉${message ? `\n\nMessage: ${message}` : ''}\n\n(GIF unavailable: Tenor API error)`
                });
            }
        } catch (error) {
            console.error('Error in poke command:', error);
            
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