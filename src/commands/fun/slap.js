const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { getRandomGif, downloadGif, cleanupTempFiles } = require('../../utils/tenorApiHandler');
const { CATEGORIES } = require('../../utils/constants');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slap')
        .setDescription('Slap another user with a GIF from Tenor')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to slap')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Why are you slapping them?')
                .setRequired(false)),
    category: CATEGORIES.FUN,
    async execute(interaction) {
        try {
            // Get command options
            const targetUser = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason');
            
            // Defer reply as API calls might take time
            await interaction.deferReply();
            
            // Check if trying to slap self
            if (targetUser.id === interaction.user.id) {
                return interaction.editReply({
                    content: "Why would you want to slap yourself? That's not very nice!"
                });
            }
            
            // Check if trying to slap the bot
            if (targetUser.id === interaction.client.user.id) {
                return interaction.editReply({
                    content: "Hey! You can't slap me! 😠"
                });
            }
            
            try {
                // Get a random slap GIF from Tenor
                const gifResult = await getRandomGif('anime slap');
                
                // Download the GIF
                const gifPath = await downloadGif(gifResult.url);
                
                // Clean up old temp files
                cleanupTempFiles(path.join(__dirname, '..', '..', 'assets', 'images', 'temp'));
                
                // Create attachment from downloaded GIF
                const attachment = new AttachmentBuilder(gifPath, { name: 'slap.gif' });
                
                // Create embed description based on reason
                let description = `**${interaction.user.username}** slapped **${targetUser.username}**!`;
                if (reason) {
                    description += `\n\n**Reason:** ${reason}`;
                }
                
                // Create the embed
                const embed = createEmbed({
                    title: '👋 SLAP!',
                    description: description,
                    image: 'attachment://slap.gif',
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
                    content: `**${interaction.user.username}** slapped **${targetUser.username}**!${reason ? `\n\nReason: ${reason}` : ''}\n\n(GIF unavailable: Tenor API error)`
                });
            }
        } catch (error) {
            console.error('Error in slap command:', error);
            
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