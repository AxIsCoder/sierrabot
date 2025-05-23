const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Delete multiple messages from a channel')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Only delete messages from this user')
                .setRequired(false))
        .addBooleanOption(option => 
            option.setName('silent')
                .setDescription('Whether to show the purge confirmation silently')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    category: CATEGORIES.MODERATION,
    async execute(interaction) {
        try {
            // Get command options
            const amount = interaction.options.getInteger('amount');
            const targetUser = interaction.options.getUser('user');
            const silent = interaction.options.getBoolean('silent') || false;
            
            // Need to defer the reply as message fetching and deletion might take time
            await interaction.deferReply({ ephemeral: silent });
            
            // Fetch messages from the channel
            const messages = await interaction.channel.messages.fetch({ limit: amount + 1 }); // +1 to account for the command message in some cases
            
            // Filter messages if a user is specified
            let filteredMessages;
            if (targetUser) {
                filteredMessages = messages.filter(msg => msg.author.id === targetUser.id);
                
                // Handle case where no messages from the user were found
                if (filteredMessages.size === 0) {
                    return await interaction.editReply({
                        content: `❌ No recent messages from ${targetUser.tag} were found in this channel.`
                    });
                }
                
                // Only take the requested amount of messages
                filteredMessages = filteredMessages.first(amount);
            } else {
                // If no user is specified, just take the requested amount
                filteredMessages = messages.first(amount);
            }
            
            // Discord's bulk delete only works on messages less than 14 days old
            const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
            const recentMessages = filteredMessages.filter(msg => msg.createdTimestamp > twoWeeksAgo);
            
            if (recentMessages.length === 0) {
                return await interaction.editReply({
                    content: '❌ No messages could be deleted. Messages must be less than 14 days old for bulk deletion.'
                });
            }
            
            // Delete the messages
            const deletedCount = await interaction.channel.bulkDelete(recentMessages, true)
                .then(deleted => deleted.size);
            
            // Handle old messages that couldn't be bulk deleted
            const oldMessagesCount = filteredMessages.length - recentMessages.length;
            let responseMessage = `✅ Successfully deleted ${deletedCount} message${deletedCount !== 1 ? 's' : ''}.`;
            
            if (oldMessagesCount > 0) {
                responseMessage += `\n⚠️ ${oldMessagesCount} message${oldMessagesCount !== 1 ? 's were' : ' was'} older than 14 days and could not be bulk deleted.`;
            }
            
            // Create success embed
            const embed = createEmbed({
                title: '🧹 Purge Complete',
                description: responseMessage,
                fields: [
                    {
                        name: 'Channel',
                        value: `<#${interaction.channelId}>`,
                        inline: true
                    },
                    {
                        name: 'Moderator',
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    },
                    {
                        name: 'Amount Requested',
                        value: amount.toString(),
                        inline: true
                    },
                    targetUser ? {
                        name: 'Target User',
                        value: `<@${targetUser.id}> (${targetUser.tag})`,
                        inline: true
                    } : null
                ].filter(Boolean), // Remove null fields
                footer: 'Sierra Bot • Made with ❤️ by Axody',
                timestamp: true
            });
            
            // Send success message (which will auto-delete after a few seconds)
            await interaction.editReply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error in purge command:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: '❌ There was an error trying to purge messages. Make sure I have the proper permissions.'
                });
            } else {
                await interaction.reply({
                    content: '❌ There was an error trying to purge messages. Make sure I have the proper permissions.',
                    ephemeral: true
                });
            }
        }
    }
}; 