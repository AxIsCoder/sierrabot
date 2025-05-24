const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { CATEGORIES } = require('../../utils/constants');
const { createEmbed } = require('../../utils/embedCreator');
const fs = require('fs');
const path = require('path');

const LEVELS_DIR = path.join(__dirname, '../../data/levels');

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

// Function to get user level data
function getUserLevel(serverId, userId) {
    const serverLevelsData = readServerLevelsData(serverId);
    if (!serverLevelsData[userId]) {
        return { xp: 0, level: 0 };
    }
    return serverLevelsData[userId];
}

// Function to calculate XP needed for next level (example formula)
function getXpForNextLevel(level) {
    return 5 * Math.pow(level, 2) + 50 * level + 100;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Displays your current level and XP.')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check the rank of (defaults to yourself)'
        )),
    category: CATEGORIES.LEVELING,
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const serverId = interaction.guild.id;
        const userId = targetUser.id;

        const userLevelData = getUserLevel(serverId, userId);
        const { xp, level } = userLevelData;
        const xpNeededForNextLevel = getXpForNextLevel(level);

        const embed = createEmbed({
            title: `${targetUser.tag}'s Rank`,
            description: `Level: **${level}**\nXP: **${xp}** / **${xpNeededForNextLevel}**`,
            color: 0x00FFFF,
            thumbnail: targetUser.displayAvatarURL()
        });

        await interaction.reply({ embeds: [embed] });
    },
}; 