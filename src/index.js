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