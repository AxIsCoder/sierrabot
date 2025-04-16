const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES, CATEGORY_NAMES, CATEGORY_EMOJIS, BOT_NAME } = require('../../utils/constants');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows all available commands or info about a specific command')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get information about a specific command')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Get all commands in a specific category')
                .setRequired(false)
                .addChoices(
                    { name: 'Utility Commands', value: CATEGORIES.UTILITY },
                    { name: 'Information Commands', value: CATEGORIES.INFO },
                    { name: 'Moderation Commands', value: CATEGORIES.MODERATION },
                    { name: 'Fun Commands', value: CATEGORIES.FUN }
                )),
    category: CATEGORIES.UTILITY,
    async execute(interaction) {
        try {
            const commandOption = interaction.options.getString('command');
            const categoryOption = interaction.options.getString('category');
            
            // Handle specific command help
            if (commandOption) {
                return await showCommandHelp(interaction, commandOption);
            }
            
            // Handle category help
            if (categoryOption) {
                return await showCategoryHelp(interaction, categoryOption);
            }
            
            // Show all categories and commands
            return await showGeneralHelp(interaction);
        } catch (error) {
            console.error('[ERROR] Error in help command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'An error occurred while showing help information.',
                    ephemeral: true
                }).catch(console.error);
            }
        }
    },
    // Export these functions so they can be used by the interaction handler
    showCategoryHelp: async (interaction, category) => {
        try {
            return await showCategoryHelp(interaction, category);
        } catch (error) {
            console.error('[ERROR] Error in exported showCategoryHelp:', error);
            
            // Different handling based on interaction type
            if (interaction.isStringSelectMenu()) {
                await interaction.update({
                    content: 'An error occurred while showing category information.',
                    embeds: [],
                    components: []
                }).catch(console.error);
            } else if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'An error occurred while showing category information.',
                    ephemeral: true
                }).catch(console.error);
            }
        }
    },
    showCommandHelp,
    showGeneralHelp
};

async function showGeneralHelp(interaction) {
    try {
        const client = interaction.client;
        const commandsPath = path.join(__dirname, '../../commands');
        const categories = Object.values(CATEGORIES);
        
        // Create embed fields for each category
        const fields = [];
        
        for (const category of categories) {
            const categoryPath = path.join(commandsPath, category);
            
            // Skip if the category directory doesn't exist
            if (!fs.existsSync(categoryPath)) continue;
            
            const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
            
            if (commandFiles.length === 0) continue;
            
            // Get all command names in this category
            const commandNames = [];
            
            for (const file of commandFiles) {
                try {
                    const command = require(path.join(categoryPath, file));
                    
                    // Ensure command has the required data property with a name
                    if (command && command.data && command.data.name) {
                        commandNames.push(`\`/${command.data.name}\``);
                    }
                } catch (error) {
                    console.error(`[ERROR] Error loading command in ${file}:`, error);
                }
            }
            
            if (commandNames.length === 0) continue;
            
            // Add field for this category
            fields.push({
                name: `${CATEGORY_EMOJIS[category]} ${CATEGORY_NAMES[category]} Commands`,
                value: commandNames.join(', ')
            });
        }
        
        // Create dropdown menu for categories
        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('help_category_select')
                    .setPlaceholder('Select a category for more info')
                    .addOptions(categories.map(category => ({
                        label: CATEGORY_NAMES[category],
                        description: `View all ${CATEGORY_NAMES[category].toLowerCase()} commands`,
                        value: category,
                        emoji: CATEGORY_EMOJIS[category]
                    })))
            );
        
        // Create the help embed
        const embed = createEmbed({
            title: `${BOT_NAME} Bot Help`,
            description: 'Below are all available commands organized by category.\nSelect a category from the dropdown menu for more detailed information or use `/help command:name`.',
            fields: fields,
            thumbnail: interaction.client.user.displayAvatarURL(),
            footer: `${BOT_NAME} Bot • Made with ❤️ by Axody`,
            timestamp: true
        });
        
        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error('[ERROR] Error in showGeneralHelp:', error);
        throw error; // Re-throw to be handled by execute
    }
}

async function showCategoryHelp(interaction, category) {
    try {
        const commandsPath = path.join(__dirname, '../../commands', category);
        
        // Check if category exists
        if (!fs.existsSync(commandsPath)) {
            const content = `Category \`${category}\` not found!`;
            
            // Handle differently based on interaction type
            if (interaction.isStringSelectMenu()) {
                return await interaction.update({
                    content,
                    embeds: [],
                    components: []
                });
            } else {
                return await interaction.reply({
                    content,
                    ephemeral: true
                });
            }
        }
        
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
        
        if (commandFiles.length === 0) {
            const content = `No commands found in category \`${CATEGORY_NAMES[category]}\`!`;
            
            // Handle differently based on interaction type
            if (interaction.isStringSelectMenu()) {
                return await interaction.update({
                    content,
                    embeds: [],
                    components: []
                });
            } else {
                return await interaction.reply({
                    content,
                    ephemeral: true
                });
            }
        }
        
        // Create fields for each command in the category
        const fields = [];
        
        for (const file of commandFiles) {
            try {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);
                
                if (command && command.data && command.data.name && command.data.description) {
                    fields.push({
                        name: `/${command.data.name}`,
                        value: command.data.description
                    });
                }
            } catch (error) {
                console.error(`[ERROR] Error loading command in ${file}:`, error);
            }
        }
        
        if (fields.length === 0) {
            const content = `No valid commands found in category \`${CATEGORY_NAMES[category]}\`!`;
            
            // Handle differently based on interaction type
            if (interaction.isStringSelectMenu()) {
                return await interaction.update({
                    content,
                    embeds: [],
                    components: []
                });
            } else {
                return await interaction.reply({
                    content,
                    ephemeral: true
                });
            }
        }
        
        // Create the category help embed
        const embed = createEmbed({
            title: `${CATEGORY_EMOJIS[category]} ${CATEGORY_NAMES[category]} Commands`,
            description: `Here are all the commands in the ${CATEGORY_NAMES[category]} category:`,
            fields: fields,
            footer: `${BOT_NAME} Bot • Made with ❤️ by Axody`,
            timestamp: true
        });
        
        // Handle differently based on interaction type
        if (interaction.isStringSelectMenu()) {
            return await interaction.update({ embeds: [embed] });
        } else {
            return await interaction.reply({ embeds: [embed] });
        }
    } catch (error) {
        console.error('[ERROR] Error in showCategoryHelp:', error);
        throw error; // Re-throw to be handled by the caller
    }
}

async function showCommandHelp(interaction, commandName) {
    try {
        const command = interaction.client.commands.get(commandName);
        
        // Check if command exists
        if (!command) {
            return await interaction.reply({
                content: `Command \`${commandName}\` not found!`,
                ephemeral: true
            });
        }
        
        // Get command options if any
        let optionsDescription = '';
        if (command.data.options && command.data.options.length > 0) {
            optionsDescription = command.data.options.map(option => {
                const required = option.required ? '(required)' : '(optional)';
                return `\`${option.name}\`: ${option.description} ${required}`;
            }).join('\n');
        } else {
            optionsDescription = 'No options for this command.';
        }
        
        // Create the command help embed
        const embed = createEmbed({
            title: `Command: /${command.data.name}`,
            description: command.data.description,
            fields: [
                {
                    name: 'Category',
                    value: `${CATEGORY_EMOJIS[command.category]} ${CATEGORY_NAMES[command.category]}`,
                    inline: true
                },
                {
                    name: 'Options',
                    value: optionsDescription
                },
                {
                    name: 'Usage',
                    value: `\`/${command.data.name}\` ${command.data.options?.length > 0 ? '[options]' : ''}`
                }
            ],
            footer: `${BOT_NAME} Bot • Made with ❤️ by Axody`,
            timestamp: true
        });
        
        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('[ERROR] Error in showCommandHelp:', error);
        throw error; // Re-throw to be handled by execute
    }
} 