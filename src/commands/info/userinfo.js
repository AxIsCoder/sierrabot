const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Shows detailed information about a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to get information about (defaults to yourself)')
                .setRequired(false)),
    category: CATEGORIES.INFO,
    async execute(interaction) {
        // Get the target user (defaults to the command user)
        const targetUser = interaction.options.getUser('user') || interaction.user;
        
        try {
            // Fetch the GuildMember if available
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            
            // Format timestamps
            const createdTimestamp = Math.floor(targetUser.createdAt.getTime() / 1000);
            const createdString = `<t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)`;
            
            let joinedString = 'Not a member of this server';
            let roleString = 'None';
            let displayColor = targetUser.accentColor || null;
            
            // If the user is a member of the guild, get additional information
            if (member) {
                const joinedTimestamp = Math.floor(member.joinedAt.getTime() / 1000);
                joinedString = `<t:${joinedTimestamp}:F> (<t:${joinedTimestamp}:R>)`;
                
                // Get roles (excluding @everyone)
                const roles = member.roles.cache
                    .filter(role => role.id !== interaction.guild.id)
                    .sort((a, b) => b.position - a.position);
                
                if (roles.size) {
                    roleString = roles.size > 10 
                        ? [...roles.values()].slice(0, 10).join(', ') + ` and ${roles.size - 10} more...`
                        : [...roles.values()].join(', ');
                }
                
                // Use member's display color if available
                displayColor = member.displayHexColor !== '#000000' ? member.displayHexColor : null;
            }
            
            // Determine user status (bot, system, etc.)
            const userFlags = targetUser.flags ? [...targetUser.flags.toArray()] : [];
            const userStatus = [];
            
            if (targetUser.bot) userStatus.push('🤖 Bot');
            if (targetUser.system) userStatus.push('⚙️ System');
            
            // Map user badges
            const badges = userFlags.map(flag => formatUserFlag(flag)).join(', ');
            
            // Create the embed
            const embed = createEmbed({
                author: targetUser.tag,
                authorIcon: targetUser.displayAvatarURL({ dynamic: true }),
                description: userStatus.length ? userStatus.join(' | ') : null,
                thumbnail: targetUser.displayAvatarURL({ dynamic: true, size: 1024 }),
                fields: [
                    {
                        name: '📋 User Information',
                        value: [
                            `**ID:** ${targetUser.id}`,
                            `**Created:** ${createdString}`,
                            badges ? `**Badges:** ${badges}` : null
                        ].filter(Boolean).join('\n')
                    }
                ],
                footer: 'Sierra Bot • Made with ❤️ by Axody',
                timestamp: true
            });
            
            // Add member-specific information if available
            if (member) {
                // Display nickname and joined date
                embed.addFields({
                    name: '🧩 Server Member',
                    value: [
                        member.nickname ? `**Nickname:** ${member.nickname}` : null,
                        `**Joined:** ${joinedString}`,
                        member.premiumSince ? `**Boosting Since:** <t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>` : null
                    ].filter(Boolean).join('\n')
                });
                
                // Display member roles if they have any besides @everyone
                if (roleString !== 'None') {
                    embed.addFields({
                        name: `👑 Roles (${member.roles.cache.size - 1})`,
                        value: roleString
                    });
                }
                
                // Add user's banner if available
                if (member.banner) {
                    embed.setImage(member.bannerURL({ size: 1024 }));
                }
            }
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error(`Error in userinfo command:`, error);
            await interaction.reply({ 
                content: 'There was an error fetching user information.',
                ephemeral: true
            });
        }
    }
};

// Helper function to format user flags/badges
function formatUserFlag(flag) {
    const flagEmojis = {
        'Staff': '👨‍💼 Discord Staff',
        'Partner': '👥 Partner',
        'Hypesquad': '🏠 HypeSquad Events',
        'BugHunterLevel1': '🐛 Bug Hunter (Level 1)',
        'BugHunterLevel2': '🐛 Bug Hunter (Level 2)',
        'HypeSquadOnlineHouse1': '🏠 House of Bravery',
        'HypeSquadOnlineHouse2': '🏠 House of Brilliance',
        'HypeSquadOnlineHouse3': '🏠 House of Balance',
        'PremiumEarlySupporter': '👑 Early Supporter',
        'TeamPseudoUser': '👥 Team User',
        'VerifiedBot': '✅ Verified Bot',
        'VerifiedDeveloper': '👨‍💻 Verified Developer',
        'CertifiedModerator': '🛡️ Moderator Programs Alumni',
        'BotHTTPInteractions': '🔌 HTTP Interactions',
        'ActiveDeveloper': '👨‍💻 Active Developer'
    };
    
    return flagEmojis[flag] || flag;
} 