const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servericon')
        .setDescription('Shows the server\'s icon in full size'),
    category: CATEGORIES.INFO,
    async execute(interaction) {
        try {
            // Check if the guild has an icon
            if (!interaction.guild.icon) {
                return interaction.reply({
                    content: 'This server does not have an icon.',
                    ephemeral: true
                });
            }
            
            // Get the server icon URL in the largest size
            const iconURL = interaction.guild.iconURL({ 
                size: 4096, 
                dynamic: true 
            });
            
            // Get static format URLs for buttons
            const iconURLPNG = iconURL.replace(/\.(gif|jpg|jpeg|webp)(\?.*)?$/i, '.png');
            const iconURLJPG = iconURL.replace(/\.(gif|png|webp)(\?.*)?$/i, '.jpg');
            const iconURLWebP = iconURL.replace(/\.(gif|jpg|jpeg|png)(\?.*)?$/i, '.webp');
            
            // Create buttons for different formats
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setLabel('PNG')
                        .setStyle(ButtonStyle.Link)
                        .setURL(iconURLPNG),
                    new ButtonBuilder()
                        .setLabel('JPG')
                        .setStyle(ButtonStyle.Link)
                        .setURL(iconURLJPG),
                    new ButtonBuilder()
                        .setLabel('WebP')
                        .setStyle(ButtonStyle.Link)
                        .setURL(iconURLWebP)
                );
            
            // Add GIF button if the icon is animated
            if (interaction.guild.icon && interaction.guild.icon.startsWith('a_')) {
                const iconURLGIF = iconURL.replace(/\.(jpg|jpeg|png|webp)(\?.*)?$/i, '.gif');
                
                row.addComponents(
                    new ButtonBuilder()
                        .setLabel('GIF')
                        .setStyle(ButtonStyle.Link)
                        .setURL(iconURLGIF)
                );
            }
            
            // Create the embed
            const embed = createEmbed({
                title: `Server Icon for ${interaction.guild.name}`,
                description: 'Click the buttons below to open the icon in different formats.',
                image: iconURL,
                fields: [
                    {
                        name: 'Server Created',
                        value: `<t:${Math.floor(interaction.guild.createdTimestamp / 1000)}:F> (<t:${Math.floor(interaction.guild.createdTimestamp / 1000)}:R>)`,
                        inline: true
                    },
                    {
                        name: 'Member Count',
                        value: `${interaction.guild.memberCount} members`,
                        inline: true
                    }
                ],
                footer: 'Sierra Bot • Made with ❤️ by Axody',
                timestamp: true
            });
            
            // Send the response
            await interaction.reply({
                embeds: [embed],
                components: [row]
            });
            
        } catch (error) {
            console.error('Error in servericon command:', error);
            await interaction.reply({
                content: '❌ There was an error retrieving the server icon.',
                ephemeral: true
            });
        }
    }
}; 