const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('Set a reminder for yourself')
        .addStringOption(option => 
            option.setName('time')
                .setDescription('When to remind you (e.g., 1h, 30m, 5h30m)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('message')
                .setDescription('What to remind you about')
                .setRequired(true))
        .addBooleanOption(option => 
            option.setName('private')
                .setDescription('Whether to send the reminder in DMs (default: true)')
                .setRequired(false)),
    category: CATEGORIES.UTILITY,
    async execute(interaction) {
        try {
            // Get options
            const timeString = interaction.options.getString('time');
            const message = interaction.options.getString('message');
            const isPrivate = interaction.options.getBoolean('private') ?? true; // Default to true
            
            // Parse the time string to milliseconds
            const milliseconds = parseTimeString(timeString);
            
            if (milliseconds === null) {
                return interaction.reply({
                    content: '❌ Invalid time format. Please use a format like 1h30m, 45m, 1d12h.',
                    ephemeral: true
                });
            }
            
            // Set a reasonable maximum (7 days)
            const maxTime = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
            
            if (milliseconds > maxTime) {
                return interaction.reply({
                    content: '❌ Reminder time too long. Maximum reminder time is 7 days.',
                    ephemeral: true
                });
            }
            
            // Calculate the time when the reminder will trigger
            const now = Date.now();
            const reminderTime = now + milliseconds;
            
            // Create a reminder object
            const reminder = {
                userId: interaction.user.id,
                channelId: interaction.channelId,
                guildId: interaction.guildId,
                message: message,
                createdAt: now,
                reminderTime: reminderTime,
                isPrivate: isPrivate,
                id: Date.now().toString(36) + Math.random().toString(36).substr(2) // Simple unique ID
            };
            
            // Save the reminder
            saveReminder(reminder);
            
            // Format the reminder time for display
            const formattedTime = formatRelativeTime(milliseconds);
            
            // Create confirmation embed
            const embed = createEmbed({
                title: '⏰ Reminder Set',
                description: `I'll remind you ${formattedTime} from now.`,
                fields: [
                    {
                        name: 'Message',
                        value: message
                    },
                    {
                        name: 'When',
                        value: `<t:${Math.floor(reminderTime / 1000)}:F> (<t:${Math.floor(reminderTime / 1000)}:R>)`
                    },
                    {
                        name: 'Delivery Method',
                        value: isPrivate ? 'Private (DM)' : 'Public (in this channel)'
                    }
                ],
                footer: 'Sierra Bot • Made with ❤️ by Axody',
                timestamp: true
            });
            
            // Set up the reminder
            setTimeout(() => sendReminder(reminder, interaction.client), milliseconds);
            
            // Reply with confirmation
            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error in remind command:', error);
            return interaction.reply({
                content: '❌ There was an error setting your reminder.',
                ephemeral: true
            });
        }
    }
};

/**
 * Parse a time string like "1h30m" into milliseconds
 * @param {string} timeString - Time string to parse
 * @returns {number|null} - Milliseconds or null if invalid
 */
function parseTimeString(timeString) {
    // Regex to match time components
    const regex = /(\d+)([dhms])/gi;
    let match;
    let ms = 0;
    let found = false;
    
    // Time multipliers in milliseconds
    const multipliers = {
        'd': 24 * 60 * 60 * 1000, // days
        'h': 60 * 60 * 1000,      // hours
        'm': 60 * 1000,           // minutes
        's': 1000                 // seconds
    };
    
    // Find all time components
    while ((match = regex.exec(timeString)) !== null) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        
        if (value > 0 && unit in multipliers) {
            ms += value * multipliers[unit];
            found = true;
        }
    }
    
    return found ? ms : null;
}

/**
 * Format a duration in milliseconds to a human readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} - Formatted string
 */
function formatRelativeTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    
    const parts = [];
    
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0 && parts.length === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
    
    return parts.join(', ');
}

/**
 * Save a reminder to file
 * @param {Object} reminder - Reminder object
 */
function saveReminder(reminder) {
    try {
        // Create data directory if it doesn't exist
        const dataDir = path.join(__dirname, '..', '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        // Create reminders directory if it doesn't exist
        const remindersDir = path.join(dataDir, 'reminders');
        if (!fs.existsSync(remindersDir)) {
            fs.mkdirSync(remindersDir, { recursive: true });
        }
        
        // Reminder file path
        const reminderPath = path.join(remindersDir, `${reminder.id}.json`);
        
        // Save the reminder
        fs.writeFileSync(reminderPath, JSON.stringify(reminder, null, 2));
    } catch (error) {
        console.error('Error saving reminder:', error);
    }
}

/**
 * Send a reminder when it's due
 * @param {Object} reminder - The reminder object
 * @param {Client} client - The Discord.js client
 */
async function sendReminder(reminder, client) {
    try {
        // Get the user
        const user = await client.users.fetch(reminder.userId);
        
        // Create reminder embed
        const embed = createEmbed({
            title: '⏰ Reminder',
            description: `You asked me to remind you about:`,
            fields: [
                {
                    name: 'Message',
                    value: reminder.message
                },
                {
                    name: 'Created',
                    value: `<t:${Math.floor(reminder.createdAt / 1000)}:R>`
                }
            ],
            footer: 'Sierra Bot • Made with ❤️ by Axody',
            timestamp: true
        });
        
        // Send the reminder based on user preference
        if (reminder.isPrivate) {
            // Send via DM
            await user.send({ embeds: [embed] }).catch(error => {
                console.error(`Could not send DM to ${user.tag}:`, error);
                // Fallback to channel if DM fails
                sendToChannel();
            });
        } else {
            // Send to the channel
            sendToChannel();
        }
        
        // Helper function to send to channel
        async function sendToChannel() {
            try {
                const guild = await client.guilds.fetch(reminder.guildId);
                const channel = await guild.channels.fetch(reminder.channelId);
                
                await channel.send({
                    content: `<@${user.id}>, here's your reminder:`,
                    embeds: [embed]
                });
            } catch (error) {
                console.error('Error sending reminder to channel:', error);
            }
        }
        
        // Delete the reminder file
        try {
            const reminderPath = path.join(__dirname, '..', '..', 'data', 'reminders', `${reminder.id}.json`);
            fs.unlinkSync(reminderPath);
        } catch (error) {
            console.error('Error deleting reminder file:', error);
        }
    } catch (error) {
        console.error('Error sending reminder:', error);
    }
} 