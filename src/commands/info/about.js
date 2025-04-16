const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES, BOT_NAME, GITHUB_REPO, SUPPORT_SERVER } = require('../../utils/constants');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const os = require('os');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('about')
        .setDescription('Shows information about the bot, its creator, and statistics'),
    category: CATEGORIES.INFO,
    async execute(interaction) {
        await interaction.deferReply();

        try {
            // Get bot uptime
            const uptime = formatUptime(interaction.client.uptime);
            
            // Get system info
            const platform = `${os.type()} ${os.release()} (${os.arch()})`;
            const memoryUsage = Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100;
            
            // Get the last commit info (if git is available)
            let lastCommitInfo = "Information not available";
            
            try {
                // Only attempt to get git info if in development environment
                const { stdout } = await execAsync('git log -1 --format="[%h] %s (%cr)"');
                lastCommitInfo = stdout.trim();
            } catch (gitError) {
                console.error('Error getting git information:', gitError);
            }
            
            // Create the embed
            const embed = createEmbed({
                title: `About ${BOT_NAME} Bot`,
                description: `**${BOT_NAME}** is an open-source Discord bot created by **Axiscoder**. It's designed to provide utility, moderation, and fun features for your Discord server.`,
                thumbnail: interaction.client.user.displayAvatarURL({ dynamic: true, size: 512 }),
                fields: [
                    {
                        name: '👨‍💻 Developer',
                        value: 'Axiscoder',
                        inline: true
                    },
                    {
                        name: '🤖 Bot Version',
                        value: 'v1.0.0',
                        inline: true
                    },
                    {
                        name: '📊 Statistics',
                        value: [
                            `**Uptime:** ${uptime}`,
                            `**Memory Usage:** ${memoryUsage} MB`,
                            `**Servers:** ${interaction.client.guilds.cache.size}`,
                            `**Node.js:** ${process.version}`
                        ].join('\n')
                    },
                    {
                        name: '📝 Last Update',
                        value: lastCommitInfo
                    },
                    {
                        name: '🔗 Links',
                        value: [
                            `[GitHub Repository](${GITHUB_REPO})`,
                            `[Invite Bot](https://discord.com/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands)`,
                            `[Support Server](${SUPPORT_SERVER})`
                        ].join('\n')
                    }
                ],
                footer: `${BOT_NAME} Bot • Made with ❤️ by Axody`,
                timestamp: true
            });
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in about command:', error);
            
            if (interaction.deferred) {
                await interaction.editReply({ 
                    content: 'There was an error fetching information about the bot.',
                    ephemeral: true
                });
            } else {
                await interaction.reply({ 
                    content: 'There was an error fetching information about the bot.',
                    ephemeral: true
                });
            }
        }
    }
};

// Helper function to format uptime
function formatUptime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    
    const parts = [];
    
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
    
    return parts.join(', ');
} 