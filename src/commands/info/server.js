const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Shows detailed information about the current server'),
    category: CATEGORIES.INFO,
    async execute(interaction) {
        const { guild } = interaction;
        
        // Get server creation date
        const createdAt = guild.createdAt;
        const createdTimestamp = Math.floor(createdAt.getTime() / 1000);
        const createdString = `<t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)`;
        
        // Get member counts
        const totalMembers = guild.memberCount;
        const botCount = guild.members.cache.filter(member => member.user.bot).size;
        const humanCount = totalMembers - botCount;
        
        // Get channel counts
        const textChannels = guild.channels.cache.filter(c => c.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size;
        const categoryChannels = guild.channels.cache.filter(c => c.type === 4).size;
        const threadChannels = guild.channels.cache.filter(c => [11, 12].includes(c.type)).size;
        
        // Get AFK channel if exists
        const afkChannel = guild.afkChannel 
            ? `${guild.afkChannel.name} (${guild.afkTimeout / 60} min)` 
            : 'None';
        
        // Get server features as a formatted list
        const features = guild.features.length 
            ? guild.features.map(f => `• ${formatFeature(f)}`).join('\n') 
            : 'No special features';
        
        // Create the embed
        const embed = createEmbed({
            title: guild.name,
            description: guild.description || 'No server description set.',
            thumbnail: guild.iconURL({ dynamic: true, size: 1024 }),
            fields: [
                {
                    name: '📊 Overview',
                    value: [
                        `**ID:** ${guild.id}`,
                        `**Owner:** <@${guild.ownerId}>`,
                        `**Created:** ${createdString}`,
                        `**Boost Tier:** ${guild.premiumTier || 'None'} (${guild.premiumSubscriptionCount} boosts)`
                    ].join('\n')
                },
                {
                    name: '👥 Members',
                    value: `Total: ${totalMembers}\nHumans: ${humanCount}\nBots: ${botCount}`,
                    inline: true
                },
                {
                    name: '💬 Channels',
                    value: `Text: ${textChannels}\nVoice: ${voiceChannels}\nCategories: ${categoryChannels}\nThreads: ${threadChannels}`,
                    inline: true
                },
                {
                    name: '🔍 Other',
                    value: [
                        `**Roles:** ${guild.roles.cache.size}`,
                        `**Emojis:** ${guild.emojis.cache.size}`,
                        `**AFK Channel:** ${afkChannel}`,
                        `**Verification Level:** ${formatVerificationLevel(guild.verificationLevel)}`
                    ].join('\n'),
                    inline: true
                }
            ],
            footer: 'Sierra Bot • Made with ❤️ by Axody',
            timestamp: true
        });
        
        // Add server banner or splash if exists
        if (guild.banner) {
            embed.setImage(guild.bannerURL({ size: 1024 }));
        } else if (guild.splash) {
            embed.setImage(guild.splashURL({ size: 1024 }));
        }
        
        // Add server features if any exist
        if (guild.features.length) {
            embed.addFields({
                name: '✨ Server Features',
                value: features
            });
        }
        
        await interaction.reply({ embeds: [embed] });
    }
};

// Helper function to format feature names
function formatFeature(feature) {
    return feature
        .toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Helper function to format verification levels
function formatVerificationLevel(level) {
    const levels = {
        0: 'None',
        1: 'Low (Verified Email)',
        2: 'Medium (Registered > 5 minutes)',
        3: 'High (Member > 10 minutes)',
        4: 'Highest (Verified Phone)'
    };
    
    return levels[level] || 'Unknown';
} 