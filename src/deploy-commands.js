const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { CATEGORIES } = require('./utils/constants');
require('dotenv').config();

// Verify that required environment variables are set
const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error('[ERROR] Missing required environment variables. Please check your .env file.');
    process.exit(1);
}

const commands = [];
// Get all categories
const categories = Object.values(CATEGORIES);

// Load command files from all categories
const commandsPath = path.join(__dirname, 'commands');

for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    
    // Skip if the directory doesn't exist
    if (!fs.existsSync(categoryPath)) {
        console.log(`[WARN] Category directory not found: ${category}`);
        continue;
    }
    
    // Read command files in the category
    const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
    
    if (commandFiles.length === 0) {
        console.log(`[INFO] No commands found in category: ${category}`);
        continue;
    }
    
    // Process each command file
    for (const file of commandFiles) {
        const filePath = path.join(categoryPath, file);
        const command = require(filePath);
        
        // Validate the command
        if (!command.data) {
            console.log(`[WARN] Command at ${filePath} is missing the required data property`);
            continue;
        }
        
        // Add command data to the commands array
        commands.push(command.data.toJSON());
        console.log(`[SUCCESS] Prepared command: ${command.data.name} (${category})`);
    }
}

// Create REST instance
const rest = new REST({ version: '10' }).setToken(TOKEN);

// Deploy commands
(async () => {
    try {
        console.log(`[INFO] Started refreshing ${commands.length} application (/) commands.`);

        // Deploy commands to the specific guild (for testing)
        const data = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands },
        );

        console.log(`[SUCCESS] Successfully reloaded ${data.length} application (/) commands.`);
        
        // Optional: Deploy commands globally (uncomment for production)
        // const globalData = await rest.put(
        //     Routes.applicationCommands(CLIENT_ID),
        //     { body: commands },
        // );
        // console.log(`[SUCCESS] Successfully reloaded ${globalData.length} global application (/) commands.`);
    } catch (error) {
        console.error('[ERROR] Error while deploying commands:', error);
    }
})(); 