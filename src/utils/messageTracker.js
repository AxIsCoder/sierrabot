const fs = require('fs');
const path = require('path');

// Path to message stats directory
const DATA_DIR = path.join(__dirname, '..', 'data', 'messages');

// Ensure message stats directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log('[INFO] Created directory for message statistics');
}

/**
 * Get the path to the stats file for a specific guild
 * @param {string} guildId - The guild ID
 * @returns {string} - The path to the stats file
 */
function getStatsFilePath(guildId) {
    return path.join(DATA_DIR, `messages-${guildId}.json`);
}

/**
 * Load stats for a guild
 * @param {string} guildId - The guild ID
 * @returns {Object} - Stats object for the guild
 */
function loadStats(guildId) {
    const filePath = getStatsFilePath(guildId);
    
    if (!fs.existsSync(filePath)) {
        return { users: {}, lastReset: Date.now() };
    }
    
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`[ERROR] Error loading message stats for guild ${guildId}:`, error);
        return { users: {}, lastReset: Date.now() };
    }
}

/**
 * Save stats for a guild
 * @param {string} guildId - The guild ID
 * @param {Object} stats - Stats object for the guild
 */
function saveStats(guildId, stats) {
    const filePath = getStatsFilePath(guildId);
    
    try {
        fs.writeFileSync(filePath, JSON.stringify(stats, null, 2));
    } catch (error) {
        console.error(`[ERROR] Error saving message stats for guild ${guildId}:`, error);
    }
}

// In-memory cache for frequent operations
const statsCache = {};

/**
 * Track a message from a user
 * @param {string} userId - Discord user ID
 * @param {string} username - Discord username
 * @param {string} guildId - Discord guild (server) ID
 */
function trackMessage(userId, username, guildId) {
    // Skip DM messages
    if (guildId === 'DM') return;
    
    // Load or get cached stats for this guild
    if (!statsCache[guildId]) {
        statsCache[guildId] = loadStats(guildId);
    }
    
    const stats = statsCache[guildId];
    
    // Initialize user if not exists
    if (!stats.users[userId]) {
        stats.users[userId] = {
            id: userId,
            username: username,
            messageCount: 0,
            lastMessage: Date.now()
        };
    }
    
    // Update user info
    stats.users[userId].username = username; // Update in case it changed
    stats.users[userId].messageCount += 1;
    stats.users[userId].lastMessage = Date.now();
    
    // Save stats periodically (every 10 messages per user)
    if (stats.users[userId].messageCount % 10 === 0) {
        saveStats(guildId, stats);
    }
}

/**
 * Get the top users by message count
 * @param {string} guildId - Discord guild (server) ID
 * @param {number} limit - Number of users to return
 * @returns {Array} Array of user objects with message counts
 */
function getTopUsers(guildId, limit = 10) {
    // Load or get cached stats for this guild
    if (!statsCache[guildId]) {
        statsCache[guildId] = loadStats(guildId);
    }
    
    const stats = statsCache[guildId];
    const users = Object.values(stats.users);
    
    // Sort by message count
    users.sort((a, b) => b.messageCount - a.messageCount);
    
    // Return limited number of top users
    return users.slice(0, limit).map(user => ({
        id: user.id,
        username: user.username,
        messageCount: user.messageCount
    }));
}

/**
 * Get stats for a specific user
 * @param {string} userId - Discord user ID
 * @param {string} guildId - Discord guild (server) ID
 * @returns {Object|null} User stats or null if user not found
 */
function getUserStats(userId, guildId) {
    // Load or get cached stats for this guild
    if (!statsCache[guildId]) {
        statsCache[guildId] = loadStats(guildId);
    }
    
    const stats = statsCache[guildId];
    const user = stats.users[userId];
    
    if (!user) return null;
    
    // Get the total messages across all guilds (if needed)
    // For now, we'll just use the guild-specific count
    return {
        id: user.id,
        username: user.username,
        guildMessages: user.messageCount,
        totalMessages: user.messageCount, // Could sum across guilds if needed
        lastMessage: user.lastMessage
    };
}

/**
 * Reset stats for a guild
 * @param {string} guildId - Discord guild (server) ID
 */
function resetGuildStats(guildId) {
    // Create a fresh stats object
    const newStats = {
        users: {},
        lastReset: Date.now()
    };
    
    // Update cache and save to disk
    statsCache[guildId] = newStats;
    saveStats(guildId, newStats);
}

/**
 * Force-save all cached stats to disk
 * Useful for graceful shutdown
 */
function saveAllStats() {
    for (const [guildId, stats] of Object.entries(statsCache)) {
        saveStats(guildId, stats);
    }
}

// Export the functions
module.exports = {
    trackMessage,
    getTopUsers,
    getUserStats,
    resetGuildStats,
    saveAllStats
}; 