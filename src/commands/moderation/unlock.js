const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { CATEGORIES } = require('../../utils/constants');
const { createEmbed } = require('../../utils/embedCreator');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlocks the current channel or a specified channel, allowing users to send messages again.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) // Only users with Manage Channels permission can use this command
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to unlock (defaults to the current channel)')
                .addChannelTypes(ChannelType.GuildText)) // Ensure it's a text channel
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for unlocking the channel')),
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
                content: '❌ I can only unlock text channels.',
                ephemeral: true
            });
        }

        try {
            // Get the @everyone role
            const everyoneRole = interaction.guild.roles.everyone;

            // Allow the SEND_MESSAGES permission for the @everyone role in the target channel
            await channel.permissionOverwrites.edit(everyoneRole, {
                SendMessages: null, // Set to null to remove the explicit overwrite, reverting to default role permissions
            }, { reason: `Channel unlocked by ${interaction.user.tag} for reason: ${reason}` });

            const embed = createEmbed({
                title: '🔓 Channel Unlocked',
                description: `The channel ${channel} has been unlocked.`, 
                fields: [
                    { name: 'Reason', value: reason, inline: true },
                    { name: 'Unlocked By', value: interaction.user.tag, inline: true }
                ],
                color: 0x00FF00 // Green color for success
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error unlocking channel:', error);
            await interaction.reply({
                content: '❌ An error occurred while trying to unlock the channel.',
                ephemeral: true
            });
        }
    },
}; 