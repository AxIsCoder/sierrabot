const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeouts a member for a specified duration')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to timeout')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('duration')
                .setDescription('Timeout duration (e.g., 1m, 1h, 1d)')
                .setRequired(true)
                .addChoices(
                    { name: '60 seconds', value: '60s' },
                    { name: '5 minutes', value: '5m' },
                    { name: '10 minutes', value: '10m' },
                    { name: '1 hour', value: '1h' },
                    { name: '1 day', value: '1d' },
                    { name: '1 week', value: '1w' }
                ))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the timeout')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    category: CATEGORIES.MODERATION,
    async execute(interaction) {
        // Get command options
        const targetUser = interaction.options.getUser('user');
        const durationString = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        // Convert duration string to milliseconds
        const durationInMs = parseDuration(durationString);
        if (!durationInMs) {
            return interaction.reply({
                content: '❌ Invalid duration format. Please use a valid format (e.g., 60s, 5m, 1h, 1d, 1w).',
                ephemeral: true
            });
        }
        
        // Format human readable duration for display
        const readableDuration = formatDuration(durationString);
        
        // Prevent self-timeout
        if (targetUser.id === interaction.user.id) {
            return interaction.reply({
                content: '❌ You cannot timeout yourself!',
                ephemeral: true
            });
        }
        
        // Prevent bot-timeout
        if (targetUser.id === interaction.client.user.id) {
            return interaction.reply({
                content: '❌ You cannot timeout me with my own command!',
                ephemeral: true
            });
        }
        
        try {
            // Get the member to timeout
            const member = await interaction.guild.members.fetch(targetUser.id);
            
            // Check if member can be timed out
            if (!member.moderatable) {
                return interaction.reply({
                    content: '❌ I cannot timeout this user! They may have higher permissions than me.',
                    ephemeral: true
                });
            }
            
            // Check if the command user has a higher role than the target
            if (interaction.member.roles.highest.position <= member.roles.highest.position) {
                return interaction.reply({
                    content: '❌ You cannot timeout this user as they have the same or higher role than you.',
                    ephemeral: true
                });
            }
            
            // Apply the timeout
            await member.timeout(durationInMs, reason);
            
            // Create success embed
            const embed = createEmbed({
                title: '⏱️ Member Timed Out',
                description: `**${targetUser.tag}** has been timed out for ${readableDuration}.`,
                thumbnail: targetUser.displayAvatarURL({ dynamic: true }),
                fields: [
                    {
                        name: 'User',
                        value: `<@${targetUser.id}> (${targetUser.id})`,
                        inline: true
                    },
                    {
                        name: 'Moderator',
                        value: `<@${interaction.user.id}>`,
                        inline: true
                    },
                    {
                        name: 'Duration',
                        value: readableDuration,
                        inline: true
                    },
                    {
                        name: 'Reason',
                        value: reason
                    }
                ],
                footer: 'Sierra Bot • Made with ❤️ by Axody',
                timestamp: true
            });
            
            // Send success message
            await interaction.reply({ embeds: [embed] });
            
            // Optional: Try to DM the timed out user
            try {
                const dmEmbed = createEmbed({
                    title: `You've been timed out in ${interaction.guild.name}`,
                    description: `You have been timed out by <@${interaction.user.id}> for ${readableDuration}.`,
                    fields: [
                        {
                            name: 'Reason',
                            value: reason
                        }
                    ],
                    footer: 'Sierra Bot • Made with ❤️ by Axody',
                    timestamp: true
                });
                
                await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
                    // Silently fail if DM cannot be sent
                });
            } catch (error) {
                // Ignore DM errors
            }
            
        } catch (error) {
            console.error('Error in timeout command:', error);
            return interaction.reply({
                content: '❌ There was an error trying to timeout this user.',
                ephemeral: true
            });
        }
    }
};

// Helper function to parse duration string to milliseconds
function parseDuration(durationString) {
    const durations = {
        's': 1000,
        'm': 1000 * 60,
        'h': 1000 * 60 * 60,
        'd': 1000 * 60 * 60 * 24,
        'w': 1000 * 60 * 60 * 24 * 7
    };
    
    // Return the predefined durations for choices
    switch (durationString) {
        case '60s': return 60 * 1000;
        case '5m': return 5 * 60 * 1000;
        case '10m': return 10 * 60 * 1000;
        case '1h': return 60 * 60 * 1000;
        case '1d': return 24 * 60 * 60 * 1000;
        case '1w': return 7 * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

// Helper function to format duration string to a readable format
function formatDuration(durationString) {
    const formatMap = {
        '60s': '1 minute',
        '5m': '5 minutes',
        '10m': '10 minutes',
        '1h': '1 hour',
        '1d': '1 day',
        '1w': '1 week'
    };
    
    return formatMap[durationString] || durationString;
} 