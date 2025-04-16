const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configticket')
        .setDescription('Configure the support ticket system')
        .addSubcommand(subcommand => 
            subcommand
                .setName('setup')
                .setDescription('Set up the ticket system')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel where the ticket message will be sent')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText))
                .addChannelOption(option => 
                    option.setName('ticket_category')
                        .setDescription('The category where tickets will be created')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildCategory))
                .addRoleOption(option => 
                    option.setName('support_role')
                        .setDescription('The role that can see and respond to tickets')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('title')
                        .setDescription('The title of the ticket embed')
                        .setRequired(false))
                .addStringOption(option => 
                    option.setName('description')
                        .setDescription('The description of the ticket embed')
                        .setRequired(false))
                .addStringOption(option => 
                    option.setName('color')
                        .setDescription('The color of the embed (hex code)')
                        .setRequired(false)))
        .addSubcommand(subcommand => 
            subcommand
                .setName('send')
                .setDescription('Send the ticket embed to the configured channel'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    category: CATEGORIES.UTILITY,
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'setup') {
            await setupTicketSystem(interaction);
        } else if (subcommand === 'send') {
            await sendTicketEmbed(interaction);
        }
    }
};

async function setupTicketSystem(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        const channel = interaction.options.getChannel('channel');
        const ticketCategory = interaction.options.getChannel('ticket_category');
        const supportRole = interaction.options.getRole('support_role');
        const title = interaction.options.getString('title') || 'Support Tickets';
        const description = interaction.options.getString('description') || 
            'Click the button below to open a support ticket. Our team will assist you as soon as possible.';
        const color = interaction.options.getString('color') || '#5865F2'; // Default Discord blurple
        
        // Validate that the provided channel is a text channel
        if (channel.type !== ChannelType.GuildText) {
            return await interaction.editReply({ 
                content: 'Please select a text channel for the ticket embed.',
                ephemeral: true 
            });
        }
        
        // Validate that the provided category is a category channel
        if (ticketCategory.type !== ChannelType.GuildCategory) {
            return await interaction.editReply({ 
                content: 'Please select a category channel for the tickets.',
                ephemeral: true 
            });
        }
        
        // Create config directory if it doesn't exist
        const configDir = path.join(__dirname, '..', '..', 'config');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        
        // Check if there's an existing config to preserve the lastTicketId
        let lastTicketId = 0;
        const configPath = path.join(configDir, `ticket-config-${interaction.guild.id}.json`);
        if (fs.existsSync(configPath)) {
            try {
                const existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                lastTicketId = existingConfig.lastTicketId || 0;
            } catch (readError) {
                console.error('Error reading existing config:', readError);
            }
        }
        
        // Save the ticket configuration
        const ticketConfig = {
            guildId: interaction.guild.id,
            channelId: channel.id,
            ticketCategoryId: ticketCategory.id,
            supportRoleId: supportRole.id,
            embed: {
                title: title,
                description: description,
                color: color
            },
            // Preserve the last ticket number for auto-incrementing IDs
            lastTicketId: lastTicketId
        };
        
        fs.writeFileSync(
            configPath,
            JSON.stringify(ticketConfig, null, 2)
        );
        
        // Create a preview embed to show the configuration
        const previewEmbed = createEmbed({
            title: '✅ Ticket System Configured',
            description: 'The ticket system has been configured successfully. Here\'s a preview of your ticket embed:',
            fields: [
                {
                    name: 'Channel',
                    value: `${channel}`,
                    inline: true
                },
                {
                    name: 'Ticket Category',
                    value: `${ticketCategory.name}`,
                    inline: true
                },
                {
                    name: 'Support Role',
                    value: `${supportRole}`,
                    inline: true
                }
            ],
            footer: `Use /configticket send to send the ticket embed to ${channel.name}`,
            timestamp: true
        });
        
        // Create a sample of the ticket embed
        const ticketPreviewEmbed = createEmbed({
            title: ticketConfig.embed.title,
            description: ticketConfig.embed.description,
            color: ticketConfig.embed.color,
            footer: 'This is a preview of the ticket embed',
            timestamp: true
        });
        
        // Reply with success message and preview
        await interaction.editReply({
            content: `✅ Ticket system configured successfully! The ticket embed will appear in ${channel}.`,
            embeds: [previewEmbed, ticketPreviewEmbed],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error configuring ticket system:', error);
        await interaction.editReply({
            content: 'There was an error configuring the ticket system. Please try again later.',
            ephemeral: true
        });
    }
}

async function sendTicketEmbed(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        // Check if the ticket system has been configured
        const configPath = path.join(
            __dirname, '..', '..', 'config', 
            `ticket-config-${interaction.guild.id}.json`
        );
        
        if (!fs.existsSync(configPath)) {
            return await interaction.editReply({
                content: 'Ticket system has not been configured yet. Please use `/configticket setup` first.',
                ephemeral: true
            });
        }
        
        // Read the configuration
        const ticketConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Get the channel to send the embed to
        const channel = await interaction.guild.channels.fetch(ticketConfig.channelId).catch(() => null);
        
        if (!channel) {
            return await interaction.editReply({
                content: 'The configured channel no longer exists. Please reconfigure the ticket system.',
                ephemeral: true
            });
        }
        
        // Create the embed
        const embed = createEmbed({
            title: ticketConfig.embed.title,
            description: ticketConfig.embed.description,
            color: ticketConfig.embed.color,
            footer: 'Click the button below to open a ticket',
            timestamp: true
        });
        
        // Create the button for opening tickets
        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('Open a Ticket')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎫')
        );
        
        // Send the embed with the button
        const sentMessage = await channel.send({ embeds: [embed], components: [button] });
        
        // Create a confirmation embed
        const confirmEmbed = createEmbed({
            title: '✅ Ticket Embed Sent',
            description: `The ticket embed has been sent to ${channel} successfully.`,
            fields: [
                {
                    name: 'Message Link',
                    value: `[Click to view](${sentMessage.url})`,
                    inline: false
                }
            ],
            thumbnail: interaction.client.user.displayAvatarURL({ dynamic: true }),
            footer: `Configured by ${interaction.user.tag}`,
            timestamp: true
        });
        
        // Reply with success message
        await interaction.editReply({
            content: `✅ Ticket embed sent to ${channel} successfully!`,
            embeds: [confirmEmbed],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error sending ticket embed:', error);
        await interaction.editReply({
            content: 'There was an error sending the ticket embed. Please try again later.',
            ephemeral: true
        });
    }
} 