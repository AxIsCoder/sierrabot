const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { CATEGORIES } = require('../../utils/constants');
const { createEmbed } = require('../../utils/embedCreator');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set or disable slowmode for the current channel')
        .addStringOption(option =>
            option.setName('time')
                .setDescription('Slowmode duration (e.g., 5s, 1m, 1h, 1d) or "off" to disable')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for setting slowmode')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    category: CATEGORIES.MODERATION,
    async execute(interaction) {
        try {
            const timeOption = interaction.options.getString('time');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const channel = interaction.channel;

            // Check if the user has permission to manage channels
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({
                    content: '❌ You need the "Manage Channels" permission to use this command.',
                    ephemeral: true
                });
            }

            // Handle "off" or "disable" option
            if (timeOption.toLowerCase() === 'off' || timeOption.toLowerCase() === 'disable') {
                await channel.setRateLimitPerUser(0);
                const embed = createEmbed({
                    title: '⏱️ Slowmode Disabled',
                    description: `Slowmode has been disabled in ${channel}`,
                    color: 0x00FF00,
                    fields: [
                        {
                            name: 'Channel',
                            value: `${channel}`,
                            inline: true
                        },
                        {
                            name: 'Reason',
                            value: reason,
                            inline: true
                        }
                    ],
                    footer: `Disabled by ${interaction.user.tag}`
                });
                return interaction.reply({ embeds: [embed] });
            }

            // Parse the time string
            const timeMatch = timeOption.match(/^(\d+)([smhd])$/);
            if (!timeMatch) {
                return interaction.reply({
                    content: '❌ Invalid time format. Please use a valid format (e.g., 5s, 1m, 1h, 1d) or "off" to disable.',
                    ephemeral: true
                });
            }

            const [, amount, unit] = timeMatch;
            let seconds;

            // Convert to seconds based on unit
            switch (unit) {
                case 's':
                    seconds = parseInt(amount);
                    break;
                case 'm':
                    seconds = parseInt(amount) * 60;
                    break;
                case 'h':
                    seconds = parseInt(amount) * 3600;
                    break;
                case 'd':
                    seconds = parseInt(amount) * 86400;
                    break;
                default:
                    return interaction.reply({
                        content: '❌ Invalid time unit. Please use s (seconds), m (minutes), h (hours), or d (days).',
                        ephemeral: true
                    });
            }

            // Check if the time is within Discord's limits (0-21600 seconds / 6 hours)
            if (seconds < 0 || seconds > 21600) {
                return interaction.reply({
                    content: '❌ Slowmode duration must be between 0 and 6 hours (21600 seconds).',
                    ephemeral: true
                });
            }

            // Set the slowmode
            await channel.setRateLimitPerUser(seconds);

            // Format the time for display
            let formattedTime;
            if (seconds === 0) {
                formattedTime = 'Disabled';
            } else if (seconds < 60) {
                formattedTime = `${seconds} seconds`;
            } else if (seconds < 3600) {
                formattedTime = `${Math.floor(seconds / 60)} minutes`;
            } else if (seconds < 86400) {
                formattedTime = `${Math.floor(seconds / 3600)} hours`;
            } else {
                formattedTime = `${Math.floor(seconds / 86400)} days`;
            }

            // Create and send the response embed
            const embed = createEmbed({
                title: '⏱️ Slowmode Updated',
                description: `Slowmode has been set in ${channel}`,
                color: 0x0099FF,
                fields: [
                    {
                        name: 'Channel',
                        value: `${channel}`,
                        inline: true
                    },
                    {
                        name: 'Duration',
                        value: formattedTime,
                        inline: true
                    },
                    {
                        name: 'Reason',
                        value: reason,
                        inline: true
                    }
                ],
                footer: `Set by ${interaction.user.tag}`
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in slowmode command:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: 'An error occurred while setting slowmode.',
                    ephemeral: true
                });
            }
        }
    }
}; 