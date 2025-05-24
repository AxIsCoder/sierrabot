const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { getTopUsers } = require('../../utils/messageTracker');
const { CATEGORIES, BOT_NAME } = require('../../utils/constants');

const fs = require('fs');
const path = require('path');
const LEVELS_DIR = path.join(__dirname, '../../data/levels'); // For rank leaderboard

// Function to read levels data for a specific server (duplicate from rank.js for now, consider a shared utility)
function readServerLevelsData(serverId) {
    const serverLevelsFile = path.join(LEVELS_DIR, `level-${serverId}.json`);
    try {
        if (!fs.existsSync(LEVELS_DIR)) {
            fs.mkdirSync(LEVELS_DIR, { recursive: true });
        }
        const data = fs.readFileSync(serverLevelsFile, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT' || error.message === 'Unexpected end of JSON input') {
            return {}; // { 'userId': { xp: 0, level: 0 } }
        }
        console.error(`Error reading levels data for server ${serverId}:`, error);
        return {};
    }
}

// Function to calculate XP needed for next level (duplicate from rank.js for now)
function getXpForNextLevel(level) {
    return 5 * Math.pow(level, 2) + 50 * level + 100;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View leaderboards for this server')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('The type of leaderboard to view')
                .addChoices(
                    { name: 'Rank (Level & XP)', value: 'rank' },
                    { name: 'Messages Sent', value: 'messages' }
                )
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of users to show (default: 10, max: 25)')
                .setMinValue(1)
                .setMaxValue(25)
                .setRequired(false)),
    category: CATEGORIES.LEVELING,
    async execute(interaction) {
        try {
            const guildId = interaction.guild?.id;
            if (!guildId) {
                return await interaction.reply({
                    content: "This command can only be used in a server.",
                    ephemeral: true
                });
            }
            
            const type = interaction.options.getString('type');
            let limit = interaction.options.getInteger('limit') || 10;
            limit = Math.max(1, Math.min(25, limit));
            
            let leaderboardTitle;
            let leaderboardList;

            if (type === 'messages') {
                leaderboardTitle = '📊 Message Leaderboard';
                const topUsers = getTopUsers(guildId, limit);

                if (topUsers.length === 0) {
                     return await interaction.reply({
                        content: "No message statistics available yet.",
                        ephemeral: true
                    });
                }

                leaderboardList = topUsers.map((user, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                    // Fetch member to get display name if needed, but for simplicity using stored username/tag
                    return `${medal} <@${user.id}> (${user.username}): ${user.messageCount} messages`;
                }).join('\n');

            } else if (type === 'rank') {
                 leaderboardTitle = '🏆 Rank Leaderboard';
                 const serverLevelsData = readServerLevelsData(guildId);
                 
                 // Convert the object of users to an array and sort by level and then XP
                 const sortedUsers = Object.entries(serverLevelsData)
                     .map(([userId, data]) => ({ userId, ...data }))
                     .sort((a, b) => {
                         if (b.level !== a.level) {
                             return b.level - a.level; // Sort by level descending
                         }
                         return b.xp - a.xp; // Then sort by XP descending
                     })
                     .slice(0, limit); // Apply the limit after sorting

                if (sortedUsers.length === 0) {
                     return await interaction.reply({
                        content: "No rank data available yet.",
                        ephemeral: true
                    });
                }

                 leaderboardList = sortedUsers.map((user, index) => {
                     const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                     // Try to fetch member to get their current tag/display name
                     const member = interaction.guild.members.cache.get(user.userId);
                     const userName = member ? member.user.tag : `User ID: ${user.userId}`; // Fallback if member not cached
                     const xpNeeded = getXpForNextLevel(user.level);
                     return `${medal} ${userName}: Level ${user.level} (${user.xp}/${xpNeeded} XP)`;
                 }).join('\n');

            } else { // Should not happen due to choices, but as a safeguard
                 return await interaction.reply({
                    content: "Invalid leaderboard type specified.",
                    ephemeral: true
                });
            }
            
            // Create embed for the leaderboard
            const embed = createEmbed({
                title: leaderboardTitle,
                description: leaderboardList || 'No data to display.',
                footer: `${BOT_NAME} • Leaderboard Statistics`,
                timestamp: true
            });
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[ERROR] Error in leaderboard command:', error);
            await interaction.reply({
                content: "There was an error processing your request.",
                ephemeral: true
            }).catch(console.error);
        }
    }
}; 