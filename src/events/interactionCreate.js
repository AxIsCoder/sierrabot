const { Events, InteractionType } = require('discord.js');
const { handleTicketButtonInteraction } = require('../utils/ticketManager');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        try {
            // Handle button interactions
            if (interaction.isButton()) {
                // Handle ticket creation button
                if (interaction.customId === 'create_ticket') {
                    return await handleTicketButtonInteraction(interaction);
                }
                
                // Handle other button interactions here
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
                    
                    const errorReply = {
                        content: 'There was an error while executing this command!',
                        ephemeral: true
                    };
                    
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorReply);
                    } else {
                        await interaction.reply(errorReply);
                    }
                }
            }
        } catch (error) {
            console.error('Error in interaction handling:', error);
        }
    },
}; 