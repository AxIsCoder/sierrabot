const { Events, EmbedBuilder } = require('discord.js');
const { trackMessage } = require('../utils/messageTracker');
const { createEmbed } = require('../utils/embedCreator');
const fs = require('fs');
const path = require('path');

const LEVELS_DIR = path.join(__dirname, '../data/levels');

const talkedRecently = new Set();

// Function to get the file path for a specific server's levels data
function getServerLevelsFile(serverId) {
    return path.join(LEVELS_DIR, `level-${serverId}.json`);
}

// Function to read levels data for a specific server
function readServerLevelsData(serverId) {
    const serverLevelsFile = getServerLevelsFile(serverId);
    try {
        // Ensure the levels directory exists
        if (!fs.existsSync(LEVELS_DIR)) {
            fs.mkdirSync(LEVELS_DIR, { recursive: true });
        }
        const data = fs.readFileSync(serverLevelsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If the specific server file doesn't exist or is empty, return a default structure for the server
        if (error.code === 'ENOENT' || error.message === 'Unexpected end of JSON input') {
            return {}; // { 'userId': { xp: 0, level: 0 } }
        }
        console.error(`Error reading levels data for server ${serverId}:`, error);
        return {};
    }
}

// Function to write levels data for a specific server
function writeServerLevelsData(serverId, data) {
    const serverLevelsFile = getServerLevelsFile(serverId);
    try {
         // Ensure the levels directory exists before writing
        if (!fs.existsSync(LEVELS_DIR)) {
            fs.mkdirSync(LEVELS_DIR, { recursive: true });
        }
        fs.writeFileSync(serverLevelsFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`Error writing levels data for server ${serverId}:`, error);
    }
}

// Function to calculate XP needed for next level (must match the one in rank.js)
function getXpForNextLevel(level) {
    return 5 * Math.pow(level, 2) + 50 * level + 100;
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        try {
            // Skip messages from bots
            if (message.author.bot) return;
            
            // Skip DM messages - we only process server messages for leveling and tracking
            if (!message.guild) return;

            // --- Leveling System Logic ---
            const serverId = message.guild.id;
            const userId = message.author.id;

            // Ignore messages from users who have recently gained XP to prevent spam
            if (talkedRecently.has(userId + serverId)) { // Use userId + serverId for unique cooldown per user per server
                // Still track the message even if not gaining XP this time
                 trackMessage(
                     userId,
                     message.author.username,
                     serverId
                 );
                return;
            }

            // Give a random amount of XP per message (e.g., between 5 and 15)
            const minXP = 5;
            const maxXP = 15;
            const xpGained = Math.floor(Math.random() * (maxXP - minXP + 1)) + minXP;

            const serverLevelsData = readServerLevelsData(serverId);

            // Initialize user's data if it doesn't exist for this server
            if (!serverLevelsData[userId]) {
                serverLevelsData[userId] = { xp: 0, level: 0 };
            }

            // Add XP
            serverLevelsData[userId].xp += xpGained;

            // Check for level up
            const user = serverLevelsData[userId];
            const xpNeededForNextLevel = getXpForNextLevel(user.level);

            if (user.xp >= xpNeededForNextLevel) {
                user.level++;
                user.xp -= xpNeededForNextLevel; // Carry over remaining XP

                // Announce level up with auto-delete
                try {
                    const levelUpEmbed = createEmbed({
                        title: 'Level Up!',
                        description: `🎉 Congratulations, ${message.author}!, you leveled up to level **${user.level}** in ${message.guild.name}!`, 
                        color: 0xFFFF00 // Yellow color
                    });
                    const levelUpMessage = await message.channel.send({ embeds: [levelUpEmbed] });
                    
                    // Delete the message after 30 seconds
                    setTimeout(async () => {
                        try {
                            await levelUpMessage.delete();
                        } catch (error) {
                            console.error('Error deleting level up message:', error);
                        }
                    }, 30000); // 30 seconds
                } catch (error) {
                    console.error('Error sending level up message:', error);
                }
            }

            // Write the updated data back to the file
            writeServerLevelsData(serverId, serverLevelsData);

            // Add user to the cooldown set
            talkedRecently.add(userId + serverId);
            setTimeout(() => {
                talkedRecently.delete(userId + serverId);
            }, 60000); // 1 minute cooldown (adjust as needed)

            // --- End Leveling System Logic ---

            // Track this message (This was the original functionality)
            trackMessage(
                userId,
                message.author.username,
                serverId
            );
            
        } catch (error) {
            console.error('[ERROR] Error in messageCreate event:', error);
        }
    },
}; 