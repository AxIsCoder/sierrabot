const { Client, GatewayIntentBits, Collection, Events, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { CATEGORIES, BOT_NAME } = require('./utils/constants');
require('dotenv').config();

// Create a new client instance with necessary intents
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ] 
});

// Collection for commands
client.commands = new Collection();

// Load all command categories and their commands
const commandsPath = path.join(__dirname, 'commands');

// Get all category folders
const categories = Object.values(CATEGORIES);

// Load commands from each category folder
for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    
    // Skip if the category directory doesn't exist
    if (!fs.existsSync(categoryPath)) {
        console.log(`[WARN] Category directory not found: ${category}`);
        continue;
    }
    
    const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
    
    if (commandFiles.length === 0) {
        console.log(`[INFO] No commands found in category: ${category}`);
        continue;
    }

    for (const file of commandFiles) {
        const filePath = path.join(categoryPath, file);
        const command = require(filePath);
        
        // Validate the command has required properties
        if (!command.data || !command.execute) {
            console.log(`[WARN] Command at ${filePath} is missing required properties`);
            continue;
        }
        
        // Add command to the collection
        client.commands.set(command.data.name, command);
        console.log(`[SUCCESS] Loaded command: ${command.data.name} from ${category} category`);
    }
}

// When the client is ready, log in console and set presence
client.once(Events.ClientReady, c => {
    console.log(`[SUCCESS] Ready! Logged in as ${c.user.tag}`);
    
    // Set bot's status and activity
    client.user.setPresence({
        activities: [{ 
            name: `/help | ${client.guilds.cache.size} servers`, 
            type: ActivityType.Watching 
        }],
        status: 'online',
    });
});

// Command interaction handler
client.on(Events.InteractionCreate, async interaction => {
    try {
        // Handle button interactions directly
        if (interaction.isButton()) {
            console.log(`Button clicked: ${interaction.customId} by ${interaction.user.tag} in ${interaction.guild.name}`);
            
            // Direct ticket button handler
            if (interaction.customId === 'open_ticket' || interaction.customId === 'create_ticket') {
                try {
                    // Defer reply immediately to prevent "interaction failed" errors
                    await interaction.reply({ 
                        content: "Creating your ticket...", 
                        ephemeral: true 
                    });
                    
                    // Read the ticket configuration directly
                    const configPath = path.join(__dirname, 'config', `ticket-config-${interaction.guild.id}.json`);
                    
                    if (!fs.existsSync(configPath)) {
                        return await interaction.editReply({
                            content: 'The ticket system is not configured for this server. Please ask an administrator to set it up.'
                        });
                    }
                    
                    // Read the configuration file
                    const ticketConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    
                    // Get the ticket manager utility
                    const { createTicket, findExistingTicket } = require('./utils/ticketManager');
                    
                    // Check if user already has a ticket
                    const existingTicket = await findExistingTicket(interaction.guild, interaction.user.id, ticketConfig.ticketCategoryId);
                    
                    if (existingTicket) {
                        return await interaction.editReply({
                            content: `You already have an open ticket: ${existingTicket}`
                        });
                    }
                    
                    // Create the ticket
                    const ticket = await createTicket(interaction, ticketConfig);
                    
                    if (ticket) {
                        await interaction.editReply({
                            content: `Your ticket has been created: ${ticket}`
                        });
                    } else {
                        await interaction.editReply({
                            content: 'There was an error creating your ticket. Please try again later or contact an administrator.'
                        });
                    }
                } catch (ticketError) {
                    console.error('[ERROR] Error creating ticket:', ticketError);
                    if (interaction.replied) {
                        await interaction.editReply({
                            content: 'There was an error processing your ticket request. Please try again later.'
                        }).catch(console.error);
                    }
                }
                return;
            }
            
            // Handle close ticket button
            if (interaction.customId === 'close_ticket') {
                try {
                    // Immediate reply to prevent interaction failed errors
                    await interaction.reply({ 
                        content: "Processing your request...", 
                        ephemeral: true 
                    });
                    
                    // Get the ticket manager utility
                    const { handleCloseTicketInteraction } = require('./utils/ticketManager');
                    
                    // Check if the channel is a ticket
                    const channel = interaction.channel;
                    if (!channel.name.startsWith('ticket-')) {
                        return await interaction.editReply({
                            content: 'This command can only be used in ticket channels.'
                        });
                    }
                    
                    // Get the ticket number from the channel name
                    const ticketNumber = channel.name.replace('ticket-', '');
                    
                    // Create confirmation embed and buttons
                    const { createEmbed } = require('./utils/embedCreator');
                    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                    
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
                    
                    // Send the confirmation
                    await interaction.editReply({
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
                        
                        // Acknowledge the confirmation interaction
                        await confirmation.deferUpdate();
                        
                        if (confirmation.customId === 'cancel_close') {
                            return await interaction.editReply({
                                content: 'Ticket close cancelled.',
                                embeds: [],
                                components: []
                            });
                        }
                        
                        // If confirmed, process the ticket closing
                        await interaction.editReply({
                            content: 'Closing ticket...',
                            embeds: [],
                            components: []
                        });
                        
                        // Get the transcript utility functions
                        const { generateTranscript, getUserIdFromTicket } = require('./utils/ticketManager');
                        
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
                    console.error('[ERROR] Error handling close ticket button:', error);
                    if (interaction.replied) {
                        await interaction.editReply({
                            content: 'There was an error closing the ticket. Please try again later.'
                        }).catch(console.error);
                    }
                }
                return;
            }
            
            // Handle transcript button
            if (interaction.customId === 'transcript_ticket') {
                try {
                    // Immediate reply to prevent interaction failed errors
                    await interaction.reply({ 
                        content: "Generating transcript...", 
                        ephemeral: true 
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
                    
                    // Get the transcript generation utility
                    const { generateTranscript } = require('./utils/ticketManager');
                    const { createEmbed } = require('./utils/embedCreator');
                    
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
                    
                    // Send the transcript to the user
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
                    console.error('[ERROR] Error handling transcript button:', error);
                    if (interaction.replied) {
                        await interaction.editReply({
                            content: 'There was an error generating the transcript. Please try again later.'
                        }).catch(console.error);
                    }
                }
                return;
            }
            
            // Handle confirmation buttons directly
            if (interaction.customId === 'confirm_close' || interaction.customId === 'cancel_close') {
                // These are handled directly by the awaitMessageComponent in the close_ticket handler
                // We just need to acknowledge the interaction to avoid interaction failed errors
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.deferUpdate().catch(console.error);
                }
                return;
            }
            
            // Defer to the regular event handling system for other buttons
            return;
        }
        
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            // Get the command from the collection
            const command = client.commands.get(interaction.commandName);
            
            // If command doesn't exist, ignore
            if (!command) {
                console.error(`[ERROR] No command matching ${interaction.commandName} was found.`);
                return;
            }
            
            try {
                // Execute the command
                await command.execute(interaction);
            } catch (error) {
                console.error(`[ERROR] Error executing command ${interaction.commandName}:`, error);
                
                // Handle the error response to the user
                const errorResponse = { 
                    content: 'There was an error executing this command!', 
                    ephemeral: true 
                };
                
                // Only attempt to reply if the interaction hasn't been replied to
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply(errorResponse).catch(console.error);
                } else if (interaction.replied) {
                    await interaction.followUp(errorResponse).catch(console.error);
                }
            }
        }
        
        // Handle select menu interactions
        if (interaction.isStringSelectMenu()) {
            // Handle help command category select menu
            if (interaction.customId === 'help_category_select') {
                try {
                    const selectedCategory = interaction.values[0];
                    
                    // Get the help command from our commands collection
                    const helpCommand = client.commands.get('help');
                    
                    if (helpCommand && typeof helpCommand.showCategoryHelp === 'function') {
                        // Use the command's built-in function if it's available
                        await helpCommand.showCategoryHelp(interaction, selectedCategory);
                    } else {
                        // Fallback message if the help command isn't working properly
                        await interaction.update({
                            content: 'Sorry, there was a problem loading the help information.',
                            embeds: [],
                            components: []
                        }).catch(console.error);
                    }
                } catch (error) {
                    console.error('[ERROR] Error handling select menu interaction:', error);
                    
                    // Use update instead of reply for select menu interactions
                    if (!interaction.replied) {
                        await interaction.update({
                            content: 'There was an error processing your selection.',
                            embeds: [],
                            components: []
                        }).catch(console.error);
                    }
                }
            }
        }
    } catch (error) {
        // Global error handler
        console.error('[ERROR] Unhandled interaction error:', error);
    }
});

// Login to Discord with the bot token
client.login(process.env.TOKEN).catch(error => {
    console.error('[ERROR] Failed to login to Discord:', error);
}); 