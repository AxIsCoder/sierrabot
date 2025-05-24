const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { CATEGORIES } = require('../../utils/constants');
const { createEmbed } = require('../../utils/embedCreator');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Locks the current channel or a specified channel, preventing users from sending messages.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) // Only users with Manage Channels permission can use this command
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to lock (defaults to the current channel)')
                .addChannelTypes(ChannelType.GuildText)) // Ensure it's a text channel
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for locking the channel')),
    category: CATEGORIES.MODERATION,
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Check if the bot has permissions to manage channels
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return interaction.reply({
                content: '❌ I don\'t have permission to manage channels.',
                ephemeral: true
            });
        }

        // Ensure the target is a text channel
        if (channel.type !== ChannelType.GuildText) {
            return interaction.reply({
                content: '❌ I can only lock text channels.',
                ephemeral: true
            });
        }

        try {
            // Get the @everyone role
            const everyoneRole = interaction.guild.roles.everyone;

            // Deny the SEND_MESSAGES permission for the @everyone role in the target channel
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: false,
            }, { reason: `Channel locked by ${interaction.user.tag} for reason: ${reason}` });

            const embed = createEmbed({
                title: '🔒 Channel Locked',
                description: `The channel ${channel} has been locked.`, 
                fields: [
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Locked By', value: interaction.user.tag, inline: true }
                ],
                color: 0xFF0000
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error locking channel:', error);
            await interaction.reply({
                content: '❌ An error occurred while trying to lock the channel.',
                ephemeral: true
            });
        }
    },
}; 