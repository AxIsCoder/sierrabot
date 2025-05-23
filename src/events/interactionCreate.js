const { Events, InteractionType } = require('discord.js');
const { handleTicketButtonInteraction, handleCloseTicketInteraction, handleTranscriptInteraction } = require('../utils/ticketManager');

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
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            // Handle button interactions
            if (interaction.isButton()) {
                try {
                    // Log interaction details for debugging
                    console.log(`Button interaction: ${interaction.customId} by ${interaction.user.tag}`);
                    
                    // Handle ticket creation button - support both IDs for backward compatibility
                    if (interaction.customId === 'open_ticket' || interaction.customId === 'create_ticket') {
                        // Reply immediately to avoid "interaction failed" error
                        await interaction.deferReply({ ephemeral: true });
                        
                        // Process the ticket creation
                        try {
                            const ticketChannel = await handleTicketButtonInteraction(interaction);
                            if (ticketChannel) {
                                await interaction.editReply({
                                    content: `Your ticket has been created: ${ticketChannel}`
                                }).catch(error => handleApiError(error, 'ticket creation edit reply'));
                            }
                        } catch (ticketError) {
                            console.error('Error creating ticket:', ticketError);
                            await interaction.editReply({
                                content: 'There was an error creating your ticket. Please try again later or contact an administrator.'
                            }).catch(error => handleApiError(error, 'ticket error edit reply'));
                        }
                        return;
                    }
                    
                    // Handle ticket close button
                    if (interaction.customId === 'close_ticket') {
                        await handleCloseTicketInteraction(interaction);
                        return;
                    }
                    
                    // Handle transcript button
                    if (interaction.customId === 'transcript_ticket') {
                        await handleTranscriptInteraction(interaction);
                        return;
                    }
                    
                    // Handle confirmation buttons for closing tickets
                    if (interaction.customId === 'confirm_close' || interaction.customId === 'cancel_close') {
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.deferUpdate().catch(console.error);
                        }
                        return;
                    }
                    
                    // Unknown button, provide a fallback response
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ 
                            content: 'This button action is not recognized.', 
                            ephemeral: true
                        }).catch(error => handleApiError(error, 'unknown button reply'));
                    }
                } catch (buttonError) {
                    // Only log non-API errors fully
                    if (!buttonError.code) {
                        console.error('Error handling button interaction:', buttonError);
                    }
                    
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ 
                            content: 'An error occurred while processing this button. Please try again later.', 
                            ephemeral: true
                        }).catch(error => handleApiError(error, 'button error reply'));
                    }
                }
                return;
            }
            
            // Handle select menu interactions
            if (interaction.isStringSelectMenu()) {
                try {
                    console.log(`Select menu interaction: ${interaction.customId} by ${interaction.user.tag}`);
                    
                    // Handle help category selection
                    if (interaction.customId === 'help_category_select') {
                        const selectedCategory = interaction.values[0];
                        const helpCommand = interaction.client.commands.get('help');
                        
                        if (helpCommand && helpCommand.showCategoryHelp) {
                            await helpCommand.showCategoryHelp(interaction, selectedCategory);
                        } else {
                            await interaction.update({
                                content: 'Sorry, I couldn\'t load the help information for this category.',
                                embeds: [],
                                components: []
                            }).catch(error => handleApiError(error, 'help menu selection error'));
                        }
                        return;
                    }
                    
                    // Unknown select menu
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.update({
                            content: 'This selection is not recognized.',
                            embeds: [],
                            components: []
                        }).catch(error => handleApiError(error, 'unknown menu selection'));
                    }
                } catch (selectError) {
                    // Only log non-API errors fully
                    if (!selectError.code) {
                        console.error('Error handling select menu interaction:', selectError);
                    }
                    
                    if (!interaction.replied && !interaction.deferred) {
                        try {
                            await interaction.update({
                                content: 'An error occurred while processing this selection. Please try again later.',
                                embeds: [],
                                components: []
                            }).catch(error => handleApiError(error, 'select menu error update'));
                        } catch (responseError) {
                            console.log('[WARN] Failed to respond with select menu error message');
                            // Try fallback to reply if update fails
                            try {
                                await interaction.reply({
                                    content: 'An error occurred while processing this selection. Please try again later.',
                                    ephemeral: true
                                }).catch(error => handleApiError(error, 'select menu fallback reply'));
                            } catch (fallbackError) {
                                console.log('[WARN] Failed to send fallback error message for select menu');
                            }
                        }
                    }
                }
                return;
            }
            
            // Handle slash commands
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);
                
                if (!command) {
                    console.log(`[WARN] No command matching ${interaction.commandName} was found.`);
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({
                            content: 'This command is not available.',
                            ephemeral: true
                        }).catch(error => handleApiError(error, 'unknown command reply'));
                    }
                    return;
                }
                
                try {
                    // Execute the command
                    await command.execute(interaction);
                } catch (error) {
                    // Only log non-API errors fully
                    if (!error.code) {
                        console.error(`Error executing ${interaction.commandName}:`, error);
                    } else {
                        console.log(`[WARN] API error in ${interaction.commandName}: ${error.code}`);
                    }
                    
                    try {
                        // If the command hasn't handled the interaction yet, reply with an error
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                content: 'There was an error while executing this command!',
                                ephemeral: true
                            }).catch(error => handleApiError(error, 'command error reply'));
                        }
                        // If the command deferred but didn't complete, edit the reply
                        else if (interaction.deferred && !interaction.replied) {
                            await interaction.editReply({
                                content: 'There was an error while executing this command!'
                            }).catch(error => handleApiError(error, 'command error edit reply'));
                        }
                    } catch (responseError) {
                        console.log('[WARN] Failed to respond with command error message');
                    }
                }
            }
        } catch (error) {
            // Only log non-API errors fully
            if (!error.code) {
                console.error('Error in interaction handling:', error);
            } else {
                console.log(`[WARN] API error in interaction handling: ${error.code}`);
            }
            
            // Only try to respond if we haven't already
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'There was an error processing your request.',
                    ephemeral: true
                }).catch(error => handleApiError(error, 'global error reply'));
            }
        }
    },
}; 