const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { createEmbed } = require('./embedCreator');
const fs = require('fs');
const path = require('path');

/**
 * Handle when a user clicks the create ticket button
 * @param {Object} interaction - The button interaction
 * @returns {Promise<void>}
 */
async function handleTicketButtonInteraction(interaction) {
    try {
        // First acknowledge the interaction to prevent timeouts
        await interaction.deferReply({ ephemeral: true });
        
        // Check if the ticket system is configured for this guild
        const configPath = path.join(
            __dirname, '..', 'config', 
            `ticket-config-${interaction.guild.id}.json`
        );
        
        if (!fs.existsSync(configPath)) {
            return await interaction.editReply({
                content: 'The ticket system is not configured properly. Please contact an administrator.',
                ephemeral: true
            });
        }
        
        // Read ticket configuration
        const ticketConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Check if user already has an open ticket
        const existingTicket = await findExistingTicket(interaction.guild, interaction.user.id, ticketConfig.ticketCategoryId);
        
        if (existingTicket) {
            return await interaction.editReply({
                content: `You already have an open ticket: ${existingTicket}`,
                ephemeral: true
            });
        }
        
        // Create a new ticket
        const ticket = await createTicket(interaction, ticketConfig);
        
        return await interaction.editReply({
            content: `Your ticket has been created: ${ticket}`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error handling ticket button interaction:', error);
        
        // Handle the case where interaction might not be deferred yet
        try {
            if (interaction.deferred) {
                return await interaction.editReply({
                    content: 'There was an error creating your ticket. Please try again later or contact an administrator.',
                    ephemeral: true
                });
            } else {
                return await interaction.reply({
                    content: 'There was an error creating your ticket. Please try again later or contact an administrator.',
                    ephemeral: true
                });
            }
        } catch (replyError) {
            console.error('Failed to reply with error message:', replyError);
        }
    }
}

/**
 * Find if a user already has an open ticket
 * @param {Object} guild - The Discord guild
 * @param {string} userId - The user's ID
 * @param {string} categoryId - The category ID for tickets
 * @returns {Promise<Channel|null>} - The existing ticket channel or null
 */
async function findExistingTicket(guild, userId, categoryId) {
    const ticketCategory = await guild.channels.fetch(categoryId).catch(() => null);
    
    if (!ticketCategory) return null;
    
    const ticketChannels = guild.channels.cache.filter(
        channel => channel.parentId === categoryId && 
                  channel.topic && 
                  channel.topic.includes(`User ID: ${userId}`)
    );
    
    return ticketChannels.first();
}

/**
 * Create a new ticket channel
 * @param {Object} interaction - The button interaction
 * @param {Object} config - The ticket configuration
 * @returns {Promise<Channel>} - The created ticket channel
 */
async function createTicket(interaction, config) {
    // Increment the ticket counter
    config.lastTicketId++;
    
    // Format the ticket number with leading zeros
    const ticketNumber = config.lastTicketId.toString().padStart(4, '0');
    
    // Save the updated config with the new ticket number
    fs.writeFileSync(
        path.join(__dirname, '..', 'config', `ticket-config-${interaction.guild.id}.json`),
        JSON.stringify(config, null, 2)
    );
    
    // Get the support role
    const supportRole = await interaction.guild.roles.fetch(config.supportRoleId).catch(() => null);
    
    if (!supportRole) {
        throw new Error('Support role not found. The ticket system may not be configured correctly.');
    }
    
    // Set up permissions
    const permissionOverwrites = [
        {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
            id: interaction.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks],
        },
        {
            id: supportRole.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.ManageMessages],
        }
    ];
    
    // Create the ticket channel
    const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${ticketNumber}`,
        type: ChannelType.GuildText,
        parent: config.ticketCategoryId,
        topic: `Support Ticket for ${interaction.user.tag} | User ID: ${interaction.user.id}`,
        permissionOverwrites: permissionOverwrites
    });
    
    // Create buttons for ticket management
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒'),
        new ButtonBuilder()
            .setCustomId('transcript_ticket')
            .setLabel('Get Transcript')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📝')
    );
    
    // Create welcome embed
    const embed = createEmbed({
        title: `Ticket #${ticketNumber}`,
        description: `Hello ${interaction.user}, thank you for creating a ticket. The support team will be with you shortly.\n\nPlease describe your issue in as much detail as possible.`,
        fields: [
            {
                name: 'User',
                value: `${interaction.user}`,
                inline: true
            },
            {
                name: 'Created At',
                value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                inline: true
            }
        ],
        footer: `Ticket ID: ${ticketNumber}`,
        timestamp: true
    });
    
    // Send the welcome message
    await ticketChannel.send({
        content: `${interaction.user} ${supportRole}`,
        embeds: [embed],
        components: [buttons]
    });
    
    return ticketChannel;
}

module.exports = {
    handleTicketButtonInteraction
}; 