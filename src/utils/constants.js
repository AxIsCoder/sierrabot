// Bot configuration and constants
module.exports = {
    // Command categories
    CATEGORIES: {
        UTILITY: 'utility',
        INFO: 'info',
        MODERATION: 'moderation',
        FUN: 'fun'
    },
    
    // Category display names
    CATEGORY_NAMES: {
        utility: 'Utility',
        info: 'Information',
        moderation: 'Moderation',
        fun: 'Fun & Games'
    },
    
    // Category emojis
    CATEGORY_EMOJIS: {
        utility: '🛠️',
        info: 'ℹ️',
        moderation: '🔨',
        fun: '🎮'
    },
    
    // Bot information
    BOT_NAME: 'Sierra',
    SUPPORT_SERVER: 'https://discord.gg/your-server',
    GITHUB_REPO: 'https://github.com/yourusername/sierra-bot',
    
    // Max items to display in lists
    MAX_LIST_ITEMS: 10,
    
    // Default embed settings
    DEFAULT_FOOTER: 'Sierra Bot • Made with ❤️ by Axody',
    
    // Error messages
    ERRORS: {
        COMMAND_ERROR: 'An error occurred while executing this command.',
        PERMISSION_ERROR: 'You do not have permission to use this command.',
        USER_NOT_FOUND: 'User not found.',
        INVALID_ARGS: 'Invalid arguments provided.'
    }
}; 