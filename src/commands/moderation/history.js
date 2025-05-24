const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { CATEGORIES } = require('../../utils/constants');
const { createEmbed } = require('../../utils/embedCreator');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('Displays a user\'s recent message history in a channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers) // Adjust permission as needed (e.g., KickMembers, BanMembers, ManageMessages)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to view history for')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to view history in (defaults to the current channel)')
                .addChannelTypes(ChannelType.GuildText)) // Ensure it's a text channel
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('Number of messages to fetch (max 100)')
                .setMinValue(1)
                .setMaxValue(100) 
                .setRequired(false)),
    category: CATEGORIES.MODERATION,
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const count = interaction.options.getInteger('count') || 10; // Default to fetching 10 messages

        // Ensure the target is a text channel
        if (channel.type !== ChannelType.GuildText) {
            return interaction.reply({
                content: '❌ I can only view history in text channels.',
                ephemeral: true
            });
        }

        try {
            // Fetch messages from the channel
            const messages = await channel.messages.fetch({ limit: count });

            // Filter messages by the target user
            const userMessages = messages.filter(msg => msg.author.id === targetUser.id);

            if (userMessages.size === 0) {
                return interaction.reply({
                    content: `🔍 No recent messages found for ${targetUser.tag} in ${channel}.`, 
                    ephemeral: true
                });
            }

            // Sort messages by creation date (oldest first for easier reading)
            const sortedMessages = userMessages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

            // Format the message history for the embed
            const historyText = sortedMessages.map(msg => 
                `**${msg.author.tag}** at ${msg.createdAt.toLocaleString()}:\n${msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content}`
            ).join('\n\n');

            const embed = createEmbed({
                title: `Message History for ${targetUser.tag} in ${channel.name}`,
                description: historyText || 'No messages found.',
                color: 0x007BFF, // Blue color
                footer: `Displaying ${userMessages.size} of the most recent ${count} messages fetched.`
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error fetching message history:', error);
            await interaction.reply({
                content: '❌ An error occurred while fetching message history.',
                ephemeral: true
            });
        }
    },
}; 