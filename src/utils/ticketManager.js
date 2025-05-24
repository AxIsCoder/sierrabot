const { PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, AttachmentBuilder, InteractionResponseType, InteractionResponse } = require('discord.js');
const { createEmbed } = require('./embedCreator');
const fs = require('fs');
const path = require('path');

/**
 * Handle when a user clicks the create ticket button
 * @param {Object} interaction - The button interaction
 * @returns {Promise<Channel|null>} - The created ticket channel or null if failed
 */
async function handleTicketButtonInteraction(interaction) {
    try {
        // Note: We now expect the interaction to already be replied to from the interactionCreate handler
        
        // Check if the ticket system is configured for this guild
        const configDir = path.join(__dirname, '..', 'data', 'ticketconfig');
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        const configPath = path.join(
            configDir,
            `ticket-config-${interaction.guild.id}.json`
        );
        
        if (!fs.existsSync(configPath)) {
            console.error('Ticket config not found:', configPath);
            return null;
        }
        
        // Read ticket configuration
        const ticketConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        // Check if user already has an open ticket
        const existingTicket = await findExistingTicket(interaction.guild, interaction.user.id, ticketConfig.ticketCategoryId);
        
        if (existingTicket) {
            return existingTicket;
        }
        
        // Create a new ticket
        const ticket = await createTicket(interaction, ticketConfig);
        return ticket;
    } catch (error) {
        console.error('Error handling ticket button interaction:', error);
        return null;
    }
}

/**
 * Handle when a user or staff member clicks the close ticket button
 * @param {Object} interaction - The button interaction
 * @returns {Promise<void>}
 */
async function handleCloseTicketInteraction(interaction) {
    try {
        await interaction.reply({ 
            content: "Processing your request...", 
            flags: 64  // Using flags value for ephemeral
        });
        
        // Check if the channel is a ticket
        const channel = interaction.channel;
        if (!channel.name.startsWith('ticket-')) {
            return await interaction.editReply({
                content: 'This command can only be used in ticket channels.'
            });
        }
        
        // Get the ticket number from the channel name
        const ticketNumber = channel.name.replace('ticket-', '');
        
        // Confirm before closing
        const confirmEmbed = createEmbed({
            title: 'Close Ticket',
            description: `Are you sure you want to close this ticket? This will archive the ticket and make it read-only.`,
            color: '#f0ad4e', // Warning color
            footer: `Ticket #${ticketNumber}`,
            timestamp: true
        });
        
        const confirmButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('confirm_close')
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('cancel_close')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );
        
        // Edit the original reply with the confirmation message
        const confirmMessage = await interaction.editReply({
            content: null,
            embeds: [confirmEmbed],
            components: [confirmButtons]
        });
        
        // Wait for confirmation response
        try {
            const confirmation = await interaction.channel.awaitMessageComponent({
                filter: i => (i.customId === 'confirm_close' || i.customId === 'cancel_close') && i.user.id === interaction.user.id,
                time: 60000 // 1 minute to confirm
            });
            
            // First acknowledge the confirmation interaction
            await confirmation.deferUpdate();
            
            if (confirmation.customId === 'cancel_close') {
                return await interaction.editReply({
                    content: 'Ticket close cancelled.',
                    embeds: [],
                    components: []
                });
            }
            
            // If confirmed, close the ticket
            await interaction.editReply({
                content: 'Closing ticket...',
                embeds: [],
                components: []
            });
            
            // Generate the transcript first
            const transcript = await generateTranscript(interaction.channel);
            
            // Find the user who opened the ticket to send them the transcript
            const userId = getUserIdFromTicket(channel);
            let ticketCreator = null;
            
            if (userId) {
                ticketCreator = await interaction.client.users.fetch(userId).catch(() => null);
            }
            
            // Send transcript to the ticket creator if found
            if (ticketCreator) {
                try {
                    const dmEmbed = createEmbed({
                        title: `Ticket Transcript #${ticketNumber}`,
                        description: `Your support ticket in ${interaction.guild.name} has been closed. Here is the transcript for your reference.`,
                        fields: [
                            {
                                name: 'Server',
                                value: interaction.guild.name,
                                inline: true
                            },
                            {
                                name: 'Ticket Number',
                                value: `#${ticketNumber}`,
                                inline: true
                            },
                            {
                                name: 'Closed By',
                                value: interaction.user.tag,
                                inline: true
                            },
                            {
                                name: 'Closed At',
                                value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                                inline: false
                            }
                        ],
                        footer: 'Thank you for contacting support',
                        timestamp: true
                    });
                    
                    await ticketCreator.send({
                        embeds: [dmEmbed],
                        files: [transcript]
                    });
                } catch (dmError) {
                    console.error('Failed to send transcript to user:', dmError);
                    // Continue with closing the ticket even if DM fails
                }
            }
            
            // Notify the channel that the ticket is being closed
            const closingEmbed = createEmbed({
                title: 'Ticket Closed',
                description: `This ticket has been closed by ${interaction.user}.`,
                fields: [
                    {
                        name: 'Ticket Number',
                        value: `#${ticketNumber}`,
                        inline: true
                    },
                    {
                        name: 'Closed At',
                        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                        inline: true
                    }
                ],
                footer: 'This channel will be deleted in 5 seconds',
                timestamp: true
            });
            
            // Send the transcript to the channel as well
            await channel.send({
                embeds: [closingEmbed],
                files: [transcript]
            });
            
            // Remove all permissions except for staff
            try {
                // First make the channel read-only for the ticket creator
                if (userId) {
                    await channel.permissionOverwrites.edit(userId, {
                        SendMessages: false,
                        AddReactions: false
                    });
                }
                
                // After a delay, delete the channel
                setTimeout(async () => {
                    try {
                        await channel.delete(`Ticket #${ticketNumber} closed by ${interaction.user.tag}`);
                    } catch (deleteError) {
                        console.error(`Failed to delete ticket channel: ${deleteError}`);
                    }
                }, 5000); // 5 second delay
            } catch (permError) {
                console.error(`Failed to update permissions: ${permError}`);
            }
        } catch (awaitError) {
            // If the user doesn't respond within time limit
            console.error('No confirmation received:', awaitError);
            await interaction.editReply({
                content: 'Ticket close cancelled due to timeout.',
                embeds: [],
                components: []
            });
        }
    } catch (error) {
        console.error('Error handling close ticket interaction:', error);
        try {
            if (interaction.replied) {
                await interaction.editReply({
                    content: 'There was an error closing the ticket. Please try again later.'
                });
            } else {
                await interaction.reply({
                    content: 'There was an error closing the ticket. Please try again later.',
                    flags: 64  // Using flags value for ephemeral
                });
            }
        } catch (replyError) {
            console.error('Failed to reply with error message:', replyError);
        }
    }
}

/**
 * Handle when a user or staff member clicks the transcript button
 * @param {Object} interaction - The button interaction
 * @returns {Promise<void>}
 */
async function handleTranscriptInteraction(interaction) {
    try {
        await interaction.reply({ 
            content: "Generating transcript...", 
            flags: 64  // Using flags value for ephemeral
        });
        
        // Check if the channel is a ticket
        const channel = interaction.channel;
        if (!channel.name.startsWith('ticket-')) {
            return await interaction.editReply({
                content: 'This command can only be used in ticket channels.'
            });
        }
        
        // Get the ticket number from the channel name
        const ticketNumber = channel.name.replace('ticket-', '');
        
        // Generate transcript
        const transcript = await generateTranscript(channel);
        
        // Create an embed for the transcript
        const transcriptEmbed = createEmbed({
            title: `Ticket Transcript #${ticketNumber}`,
            description: `Here is the transcript for this ticket as requested by ${interaction.user}.`,
            fields: [
                {
                    name: 'Ticket Number',
                    value: `#${ticketNumber}`,
                    inline: true
                },
                {
                    name: 'Generated At',
                    value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                    inline: true
                },
                {
                    name: 'Generated By',
                    value: interaction.user.tag,
                    inline: true
                }
            ],
            footer: 'This transcript contains all messages in this ticket channel',
            timestamp: true
        });
        
        // Send the transcript
        await interaction.editReply({
            content: null,
            embeds: [transcriptEmbed],
            files: [transcript]
        });
        
        // Also send to the channel
        await channel.send({
            content: `${interaction.user} generated a transcript of this ticket.`,
            files: [transcript]
        });
    } catch (error) {
        console.error('Error handling transcript interaction:', error);
        try {
            if (interaction.replied) {
                await interaction.editReply({
                    content: 'There was an error generating the transcript. Please try again later.'
                });
            } else {
                await interaction.reply({
                    content: 'There was an error generating the transcript. Please try again later.',
                    flags: 64  // Using flags value for ephemeral
                });
            }
        } catch (replyError) {
            console.error('Failed to reply with error message:', replyError);
        }
    }
}

/**
 * Generate a transcript of a ticket channel
 * @param {Object} channel - The channel to generate a transcript for
 * @returns {Promise<AttachmentBuilder>} - The transcript file
 */
async function generateTranscript(channel) {
    // Get the ticket number from the channel name
    const ticketNumber = channel.name.replace('ticket-', '');
    
    try {
        // Fetch up to 500 messages (Discord API limit per request)
        // For very long tickets, we'd need pagination, but this is sufficient for most cases
        const messages = await channel.messages.fetch({ limit: 100 });
        
        // Sort messages by timestamp (oldest first)
        const sortedMessages = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        
        // Format the transcript
        let transcriptContent = `# Ticket Transcript #${ticketNumber}\n`;
        transcriptContent += `Server: ${channel.guild.name}\n`;
        transcriptContent += `Channel: ${channel.name}\n`;
        transcriptContent += `Date: ${new Date().toISOString()}\n\n`;
        
        // Add each message to the transcript
        for (const message of sortedMessages) {
            const timestamp = new Date(message.createdTimestamp).toISOString();
            const author = message.author.tag + (message.author.bot ? ' [BOT]' : '');
            
            transcriptContent += `[${timestamp}] ${author}: ${message.content}\n`;
            
            // Add attachments
            if (message.attachments.size > 0) {
                transcriptContent += `Attachments:\n`;
                message.attachments.forEach(attachment => {
                    transcriptContent += `- ${attachment.name}: ${attachment.url}\n`;
                });
            }
            
            // Add embeds (simplified)
            if (message.embeds.length > 0) {
                transcriptContent += `Embeds: ${message.embeds.length}\n`;
                message.embeds.forEach(embed => {
                    if (embed.title) transcriptContent += `- Title: ${embed.title}\n`;
                    if (embed.description) transcriptContent += `- Description: ${embed.description}\n`;
                });
            }
            
            transcriptContent += `\n`;
        }
        
        // Create the file attachment
        return new AttachmentBuilder(
            Buffer.from(transcriptContent, 'utf-8'), 
            { name: `ticket-${ticketNumber}-transcript.txt` }
        );
    } catch (error) {
        console.error('Error generating transcript:', error);
        // Return a simple error transcript if something goes wrong
        const errorContent = `Failed to generate complete transcript for ticket #${ticketNumber}. Error: ${error.message}`;
        return new AttachmentBuilder(
            Buffer.from(errorContent, 'utf-8'), 
            { name: `ticket-${ticketNumber}-transcript-error.txt` }
        );
    }
}

/**
 * Extract user ID from ticket channel topic
 * @param {Object} channel - The ticket channel
 * @returns {string|null} - The user ID or null if not found
 */
function getUserIdFromTicket(channel) {
    if (!channel.topic) return null;
    
    const userIdMatch = channel.topic.match(/User ID: (\d+)/);
    if (userIdMatch && userIdMatch[1]) {
        return userIdMatch[1];
    }
    
    return null;
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
        path.join(__dirname, '..', 'data', 'ticketconfig', `ticket-config-${interaction.guild.id}.json`),
        JSON.stringify(config, null, 2)
    );
    
    // Handle both old and new config formats for support roles
    const supportRoleIds = config.supportRoleIds || (config.supportRoleId ? [config.supportRoleId] : []);
    
    if (supportRoleIds.length === 0) {
        throw new Error('No support roles found. The ticket system may not be configured correctly.');
    }
    
    // Set up base permissions
    const permissionOverwrites = [
        {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
            id: interaction.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks],
        }
    ];
    
    // Add each support role with its permissions
    for (const roleId of supportRoleIds) {
        try {
            const role = await interaction.guild.roles.fetch(roleId).catch(() => null);
            if (role) {
                permissionOverwrites.push({
                    id: role.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks, PermissionsBitField.Flags.ManageMessages],
                });
            }
        } catch (error) {
            console.error(`Error fetching role ${roleId}:`, error);
            // Continue with other roles even if one fails
        }
    }
    
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
    
    // Get support role mentions
    let supportRoleMentions = '';
    for (const roleId of supportRoleIds) {
        supportRoleMentions += `<@&${roleId}> `;
    }
    
    // Send the welcome message
    await ticketChannel.send({
        content: `${interaction.user} ${supportRoleMentions}`,
        embeds: [embed],
        components: [buttons]
    });
    
    return ticketChannel;
}

module.exports = {
    handleTicketButtonInteraction,
    handleCloseTicketInteraction,
    handleTranscriptInteraction,
    createTicket,
    findExistingTicket,
    generateTranscript,
    getUserIdFromTicket
}; 