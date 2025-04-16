const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Path to warning data directory
const WARNING_DIR = path.join(__dirname, '..', 'data', 'warnings');

// Ensure warning directory exists
if (!fs.existsSync(WARNING_DIR)) {
    fs.mkdirSync(WARNING_DIR, { recursive: true });
}

/**
 * Get the path to the warnings file for a specific guild
 * @param {string} guildId - The guild ID
 * @returns {string} - The path to the warnings file
 */
function getWarningsFilePath(guildId) {
    return path.join(WARNING_DIR, `warnings-${guildId}.json`);
}

/**
 * Load warnings for a guild
 * @param {string} guildId - The guild ID
 * @returns {Array} - Array of warnings
 */
function loadWarnings(guildId) {
    const filePath = getWarningsFilePath(guildId);
    
    if (!fs.existsSync(filePath)) {
        return [];
    }
    
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error loading warnings for guild ${guildId}:`, error);
        return [];
    }
}

/**
 * Save warnings for a guild
 * @param {string} guildId - The guild ID
 * @param {Array} warnings - Array of warnings
 */
function saveWarnings(guildId, warnings) {
    const filePath = getWarningsFilePath(guildId);
    
    try {
        fs.writeFileSync(filePath, JSON.stringify(warnings, null, 2));
    } catch (error) {
        console.error(`Error saving warnings for guild ${guildId}:`, error);
        throw error;
    }
}

/**
 * Get all warnings for a user in a guild
 * @param {string} guildId - The guild ID
 * @param {string} userId - The user ID
 * @returns {Array} - Array of warnings for the user
 */
function getWarnings(guildId, userId) {
    const warnings = loadWarnings(guildId);
    return warnings.filter(warning => warning.userId === userId);
}

/**
 * Get a specific warning by its ID
 * @param {string} guildId - The guild ID
 * @param {string} warningId - The warning ID
 * @returns {Object|null} - The warning object or null if not found
 */
function getWarningById(guildId, warningId) {
    const warnings = loadWarnings(guildId);
    return warnings.find(warning => warning.id === warningId) || null;
}

/**
 * Add a warning to a user
 * @param {string} guildId - The guild ID
 * @param {string} userId - The user ID
 * @param {Object} warningData - The warning data (reason, moderatorId, timestamp)
 * @returns {Object} - The created warning with count
 */
function addWarning(guildId, userId, warningData) {
    const warnings = loadWarnings(guildId);
    
    // Create the warning object
    const warning = {
        id: uuidv4(),
        userId,
        ...warningData
    };
    
    // Add the warning to the array
    warnings.push(warning);
    
    // Save the warnings
    saveWarnings(guildId, warnings);
    
    // Count the total warnings for this user
    const userWarnings = warnings.filter(w => w.userId === userId);
    
    return {
        ...warning,
        count: userWarnings.length
    };
}

/**
 * Remove a warning by ID
 * @param {string} guildId - The guild ID
 * @param {string} warningId - The warning ID
 * @returns {boolean} - True if removed, false if not found
 */
function removeWarning(guildId, warningId) {
    const warnings = loadWarnings(guildId);
    const initialLength = warnings.length;
    
    // Filter out the warning with the specified ID
    const filteredWarnings = warnings.filter(warning => warning.id !== warningId);
    
    // If the lengths are the same, no warning was removed
    if (filteredWarnings.length === initialLength) {
        return false;
    }
    
    // Save the updated warnings
    saveWarnings(guildId, filteredWarnings);
    return true;
}

/**
 * Clear all warnings for a user
 * @param {string} guildId - The guild ID
 * @param {string} userId - The user ID
 * @returns {number} - Number of warnings cleared
 */
function clearWarnings(guildId, userId) {
    const warnings = loadWarnings(guildId);
    const userWarnings = warnings.filter(warning => warning.userId === userId);
    
    // Filter out all warnings for the user
    const filteredWarnings = warnings.filter(warning => warning.userId !== userId);
    
    // Save the updated warnings
    saveWarnings(guildId, filteredWarnings);
    
    return userWarnings.length;
}

module.exports = {
    getWarnings,
    getWarningById,
    addWarning,
    removeWarning,
    clearWarnings
}; 