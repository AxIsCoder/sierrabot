const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES, CATEGORY_NAMES, CATEGORY_EMOJIS, BOT_NAME } = require('../../utils/constants');
const fs = require('fs');
const path = require('path');

// Utility function to check if interaction is still valid
function isValidInteraction(interaction) {
    // An interaction is typically valid for 15 minutes
    const interactionTimestamp = interaction.createdTimestamp;
    const now = Date.now();
    const fifteenMinutesInMs = 15 * 60 * 1000;
    
    return (now - interactionTimestamp) < fifteenMinutesInMs;
}

// Utility function to handle API errors quietly
function handleApiError(error, context) {
    // Only log specific errors as warnings without full stack trace
    if (error.code === 10062) { // Unknown Interaction
        console.log(`[WARN] Unknown interaction in ${context}`);
    } else if (error.code === 40060) { // Already acknowledged
        console.log(`[WARN] Interaction already acknowledged in ${context}`);
    } else {
        // For unexpected errors, still log the full error
        console.error(`[ERROR] Failed in ${context}:`, error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows all available commands or info about a specific command')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get information about a specific command')
                .setRequired(false)),
    category: CATEGORIES.UTILITY,
    async execute(interaction) {
        try {
            const commandOption = interaction.options.getString('command');
            
            // Handle specific command help
            if (commandOption) {
                await showCommandHelp(interaction, commandOption);
                return;
            }
            
            // Show all categories and commands
            await showGeneralHelp(interaction);
        } catch (error) {
            // Only log non-API errors fully
            if (!error.code) {
                console.error('[ERROR] Error in help command:', error);
            }
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'An error occurred while showing help information.',
                    ephemeral: true
                }).catch(error => handleApiError(error, 'execute error response'));
            }
        }
    },
    // Export these functions so they can be used by the interaction handler
    showCategoryHelp: async (interaction, category) => {
        try {
            await showCategoryHelp(interaction, category);
        } catch (error) {
            // Only log non-API errors fully
            if (!error.code) {
                console.error('[ERROR] Error in exported showCategoryHelp:', error);
            }
            
            try {
                // Different handling based on interaction type
                if (interaction.isStringSelectMenu()) {
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.update({
                            content: 'An error occurred while showing category information.',
                            embeds: [],
                            components: []
                        }).catch(error => handleApiError(error, 'exported showCategoryHelp update'));
                    }
                } else if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'An error occurred while showing category information.',
                        ephemeral: true
                    }).catch(error => handleApiError(error, 'exported showCategoryHelp reply'));
                }
            } catch (responseError) {
                console.log('[WARN] Failed to respond with error message in exported showCategoryHelp');
            }
        }
    },
    showCommandHelp,
    showGeneralHelp
};

async function showGeneralHelp(interaction) {
    try {
        // Check if interaction is still valid
        if (!isValidInteraction(interaction)) {
            console.log('[WARN] Attempted to use an expired interaction in showGeneralHelp');
            return;
        }

        const client = interaction.client;
        const commandsPath = path.join(__dirname, '../../commands');
        const categories = Object.values(CATEGORIES);
        
        // Create embed fields for each category
        const fields = [];
        
        // Also track valid categories for the dropdown
        const validCategories = [];
        
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
            
            // Add this as a valid category for the dropdown
            validCategories.push(category);
            
            // Add field for this category
            fields.push({
                name: `${CATEGORY_EMOJIS[category]} ${CATEGORY_NAMES[category]} Commands`,
                value: commandNames.join(', ')
            });
        }
        
        // Only create a dropdown if we have valid categories
        let components = [];
        if (validCategories.length > 0) {
            // Create dropdown menu for categories
            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('help_category_select')
                        .setPlaceholder('Select a category for more info')
                        .addOptions(validCategories.map(category => ({
                            label: CATEGORY_NAMES[category],
                            description: `View all ${CATEGORY_NAMES[category].toLowerCase()} commands`,
                            value: category,
                            emoji: CATEGORY_EMOJIS[category]
                        })))
                );
            components.push(row);
        }
        
        // Create the help embed
        const embed = createEmbed({
            title: `${BOT_NAME} Bot Help`,
            description: 'Below are all available commands organized by category.\nSelect a category from the dropdown menu for more detailed information or use `/help command:name`.',
            fields: fields,
            thumbnail: interaction.client.user.displayAvatarURL(),
            footer: `${BOT_NAME} Bot • Made with ❤️ by Axody`,
            timestamp: true
        });
        
        // Check again if the interaction is still valid before replying
        if (!isValidInteraction(interaction)) {
            console.log('[WARN] Interaction expired during help command processing');
            return;
        }
        
        await interaction.reply({
            embeds: [embed],
            components: components
        }).catch(error => handleApiError(error, 'showGeneralHelp reply'));
    } catch (error) {
        // Only log non-API errors fully
        if (!error.code) {
            console.error('[ERROR] Error in showGeneralHelp:', error);
        }
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: 'An error occurred while showing help information.',
                ephemeral: true
            }).catch(error => handleApiError(error, 'showGeneralHelp error response'));
        }
    }
}

async function showCategoryHelp(interaction, category) {
    try {
        // Check if interaction is still valid
        if (!isValidInteraction(interaction)) {
            console.log('[WARN] Attempted to use an expired interaction in showCategoryHelp');
            return;
        }

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
                }).catch(error => {
                    console.error('[ERROR] Failed to update select menu interaction:', error);
                });
            } else {
                return await interaction.reply({
                    content,
                    ephemeral: true
                }).catch(error => {
                    console.error('[ERROR] Failed to reply to interaction:', error);
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
                    // Generate example usage based on command options
                    let exampleUsage = `\`/${command.data.name}\``;
                    
                    // Add examples based on command name and options
                    let examples = [];
                    switch (command.data.name) {
                        // MODERATION EXAMPLES
                        case 'ban':
                            examples.push('`/ban user:@User reason:Breaking rules`');
                            break;
                        case 'unban':
                            examples.push('`/unban user:123456789012345678`');
                            break;
                        case 'kick':
                            examples.push('`/kick user:@User reason:Spamming`');
                            break;
                        case 'timeout':
                            examples.push('`/timeout user:@User duration:10m reason:Inappropriate behavior`');
                            break;
                        case 'warn':
                            examples.push('`/warn user:@User reason:Inappropriate language`');
                            break;
                        case 'purge':
                            examples.push('`/purge amount:10`');
                            break;
                            
                        // UTILITY EXAMPLES
                        case 'poll':
                            examples.push('`/poll question:"Favorite color?" options:"Blue|Red|Green"`');
                            break;
                        case 'remind':
                            examples.push('`/remind time:30m message:"Take a break"`');
                            break;
                        case 'role':
                            examples.push('`/role add user:@User role:@Member`');
                            examples.push('`/role remove user:@User role:@Member`');
                            break;
                            
                        // INFO EXAMPLES
                        case 'userinfo':
                            examples.push('`/userinfo user:@User`');
                            break;
                        case 'server':
                            examples.push('`/server`');
                            break;
                        case 'avatar':
                            examples.push('`/avatar user:@User`');
                            break;
                        case 'servericon':
                            examples.push('`/servericon`');
                            break;
                            
                        // FUN EXAMPLES
                        case 'distort':
                            examples.push('`/distort user:@User effect:pixelate`');
                            break;
                        case 'eightball':
                            examples.push('`/eightball question:"Will I win the lottery?"`');
                            break;
                        case 'hug':
                            examples.push('`/hug user:@User`');
                            break;
                        case 'slap':
                            examples.push('`/slap user:@User`');
                            break;
                        default:
                            // Default to simple command name if no specific example
                            if (command.data.options && command.data.options.length > 0) {
                                examples.push(`\`/${command.data.name} [options]\``);
                            } else {
                                examples.push(`\`/${command.data.name}\``);
                            }
                    }
                    
                    // Create field value with description and examples
                    let fieldValue = `${command.data.description}\n\n**Example Usage:**\n${examples.join('\n')}`;
                    
                    fields.push({
                        name: `/${command.data.name}`,
                        value: fieldValue
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
        
        // Check again before updating/replying
        if (!isValidInteraction(interaction)) {
            console.log('[WARN] Interaction expired during category help processing');
            return;
        }
        
        // Handle differently based on interaction type
        if (interaction.isStringSelectMenu()) {
            return await interaction.update({ embeds: [embed] })
                .catch(error => handleApiError(error, 'category select menu update'));
        } else {
            return await interaction.reply({ embeds: [embed] })
                .catch(error => handleApiError(error, 'category help reply'));
        }
    } catch (error) {
        // Only log non-API errors fully
        if (!error.code) {
            console.error('[ERROR] Error in showCategoryHelp:', error);
        }
        
        try {
            // Different handling based on interaction type
            if (interaction.isStringSelectMenu()) {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.update({
                        content: 'An error occurred while showing category information.',
                        embeds: [],
                        components: []
                    }).catch(error => handleApiError(error, 'category error update'));
                }
            } else if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'An error occurred while showing category information.',
                    ephemeral: true
                }).catch(error => handleApiError(error, 'category error reply'));
            }
        } catch (responseError) {
            console.log('[WARN] Failed to respond with error message in showCategoryHelp');
        }
    }
}

async function showCommandHelp(interaction, commandName) {
    try {
        // Check if interaction is still valid
        if (!isValidInteraction(interaction)) {
            console.log('[WARN] Attempted to use an expired interaction in showCommandHelp');
            return;
        }

        const command = interaction.client.commands.get(commandName);
        
        // Check if command exists
        if (!command) {
            return await interaction.reply({
                content: `Command \`${commandName}\` not found!`,
                ephemeral: true
            }).catch(error => {
                console.error('[ERROR] Failed to reply with command not found:', error);
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
        
        // Create example usage based on command
        let exampleUsage = '';
        
        // Add examples based on command name
        switch (command.data.name) {
            // MODERATION EXAMPLES
            case 'ban':
                exampleUsage = '`/ban user:@User reason:Breaking rules`';
                break;
            case 'unban':
                exampleUsage = '`/unban user:123456789012345678`';
                break;
            case 'kick':
                exampleUsage = '`/kick user:@User reason:Spamming`';
                break;
            case 'timeout':
                exampleUsage = '`/timeout user:@User duration:10m reason:Inappropriate behavior`';
                break;
            case 'warn':
                exampleUsage = '`/warn user:@User reason:Inappropriate language`';
                break;
            case 'purge':
                exampleUsage = '`/purge amount:10`';
                break;
                
            // UTILITY EXAMPLES
            case 'poll':
                exampleUsage = '`/poll question:"Favorite color?" options:"Blue|Red|Green"`';
                break;
            case 'remind':
                exampleUsage = '`/remind time:30m message:"Take a break"`';
                break;
            case 'role':
                exampleUsage = '`/role add user:@User role:@Member`\n`/role remove user:@User role:@Member`';
                break;
                
            // INFO EXAMPLES
            case 'userinfo':
                exampleUsage = '`/userinfo user:@User`';
                break;
            case 'server':
                exampleUsage = '`/server`';
                break;
            case 'avatar':
                exampleUsage = '`/avatar user:@User`';
                break;
            case 'servericon':
                exampleUsage = '`/servericon`';
                break;
                
            // FUN EXAMPLES
            case 'distort':
                exampleUsage = '`/distort user:@User effect:pixelate`';
                break;
            case 'eightball':
                exampleUsage = '`/eightball question:"Will I win the lottery?"`';
                break;
            case 'hug':
                exampleUsage = '`/hug user:@User`';
                break;
            case 'slap':
                exampleUsage = '`/slap user:@User`';
                break;
            default:
                // Default to simple command format
                if (command.data.options && command.data.options.length > 0) {
                    exampleUsage = `\`/${command.data.name} [options]\``;
                } else {
                    exampleUsage = `\`/${command.data.name}\``;
                }
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
                    name: 'Example Usage',
                    value: exampleUsage
                }
            ],
            footer: `${BOT_NAME} Bot • Made with ❤️ by Axody`,
            timestamp: true
        });
        
        // Check again before replying
        if (!isValidInteraction(interaction)) {
            console.log('[WARN] Interaction expired during command help processing');
            return;
        }
        
        await interaction.reply({ embeds: [embed] })
            .catch(error => handleApiError(error, 'command help reply'));
    } catch (error) {
        // Only log non-API errors fully
        if (!error.code) {
            console.error('[ERROR] Error in showCommandHelp:', error);
        }
        
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
                content: 'An error occurred while showing command help.',
                ephemeral: true
            }).catch(error => handleApiError(error, 'command help error reply'));
        }
    }
} 