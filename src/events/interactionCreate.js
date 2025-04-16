const { Events, InteractionType } = require('discord.js');
const { handleTicketButtonInteraction, handleCloseTicketInteraction, handleTranscriptInteraction } = require('../utils/ticketManager');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            // Handle button interactions
            if (interaction.isButton()) {
                try {
                    // Handle ticket creation button
                    if (interaction.customId === 'create_ticket') {
                        await handleTicketButtonInteraction(interaction);
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
                        // These are handled in the handleCloseTicketInteraction function
                        // No need to respond here as they're handled by awaitMessageComponent
                        return;
                    }
                    
                    // Unknown button, provide a fallback response
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ 
                            content: 'This button action is not recognized.', 
                            ephemeral: true 
                        });
                    }
                } catch (buttonError) {
                    console.error('Error handling button interaction:', buttonError);
                    
                    try {
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({ 
                                content: 'An error occurred while processing this button. Please try again later.', 
                                ephemeral: true 
                            });
                        } else if (interaction.deferred) {
                            await interaction.editReply({ 
                                content: 'An error occurred while processing this button. Please try again later.'
                            });
                        }
                    } catch (replyError) {
                        console.error('Failed to reply to error:', replyError);
                    }
                }
                return;
            }
            
            // Handle slash commands
            if (interaction.isChatInputCommand()) {
                const command = interaction.client.commands.get(interaction.commandName);
                
                if (!command) {
                    console.error(`No command matching ${interaction.commandName} was found.`);
                    return;
                }
                
                try {
                    await command.execute(interaction);
                } catch (error) {
                    console.error(`Error executing ${interaction.commandName}`);
                    console.error(error);
                    
                    try {
                        const errorReply = {
                            content: 'There was an error while executing this command!',
                            ephemeral: true
                        };
                        
                        if (interaction.replied || interaction.deferred) {
                            await interaction.followUp(errorReply);
                        } else {
                            await interaction.reply(errorReply);
                        }
                    } catch (replyError) {
                        console.error('Failed to reply with error message:', replyError);
                    }
                }
            }
        } catch (error) {
            console.error('Error in interaction handling:', error);
        }
    },
}; 