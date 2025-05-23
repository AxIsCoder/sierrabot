const { Client, GatewayIntentBits, Collection, Events, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { CATEGORIES, BOT_NAME } = require('./utils/constants');
const { saveAllStats } = require('./utils/messageTracker');
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

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n[INFO] Saving message statistics before shutdown...');
    saveAllStats();
    console.log('[INFO] Message statistics saved. Shutting down...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n[INFO] Saving message statistics before shutdown...');
    saveAllStats();
    console.log('[INFO] Message statistics saved. Shutting down...');
    process.exit(0);
});

// Main async function to initialize and start the bot
async function startBot() {
    try {
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
        
        // Load event files
        const eventsPath = path.join(__dirname, 'events');
        const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
        
        // Register all event handlers
        for (const file of eventFiles) {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);
            
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
            
            console.log(`[SUCCESS] Loaded event: ${event.name}`);
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
        
        // Login to Discord with the bot token
        await client.login(process.env.TOKEN);
    } catch (error) {
        console.error('[ERROR] Failed to start the bot:', error);
    }
}

// Run the bot
startBot(); 