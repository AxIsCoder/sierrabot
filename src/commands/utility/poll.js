const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a simple poll for users to vote on')
        .addStringOption(option => 
            option.setName('question')
                .setDescription('The poll question')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('options')
                .setDescription('Poll options separated by | (leave empty for yes/no poll)')
                .setRequired(false))
        .addIntegerOption(option => 
            option.setName('duration')
                .setDescription('Poll duration in minutes (0 for no auto-close)')
                .setRequired(false)
                .setMinValue(0)
                .setMaxValue(10080)) // Max 1 week (10080 minutes)
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),
    category: CATEGORIES.UTILITY,
    async execute(interaction) {
        try {
            // Get options
            const question = interaction.options.getString('question');
            const optionsString = interaction.options.getString('options');
            const duration = interaction.options.getInteger('duration') || 0;
            
            // Default emojis for yes/no poll
            const defaultEmojis = ['✅', '❌'];
            
            // Parse custom options if provided
            let options = [];
            let reactionEmojis = [];
            
            if (optionsString) {
                // Split by | and trim whitespace
                options = optionsString.split('|').map(opt => opt.trim()).filter(opt => opt.length > 0);
                
                // Limit to 10 options maximum
                if (options.length > 10) {
                    return interaction.reply({
                        content: '❌ Maximum 10 options are allowed for a poll.',
                        ephemeral: true
                    });
                }
                
                // Use number emojis for custom options
                reactionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'].slice(0, options.length);
            } else {
                // Yes/No poll
                options = ['Yes', 'No'];
                reactionEmojis = defaultEmojis;
            }
            
            // Create description with options
            let description = `**${question}**\n\n`;
            
            options.forEach((option, index) => {
                description += `${reactionEmojis[index]} ${option}\n`;
            });
            
            // Add footer note about duration
            let footerText = 'Sierra Bot • Made with ❤️ by Axody';
            if (duration > 0) {
                const endTime = new Date(Date.now() + duration * 60000);
                description += `\nThis poll will end <t:${Math.floor(endTime.getTime() / 1000)}:R>`;
            }
            
            // Create the embed
            const embed = createEmbed({
                title: '📊 Poll',
                description: description,
                footer: footerText,
                timestamp: true
            });
            
            // Send the poll embed
            const pollMessage = await interaction.reply({ 
                embeds: [embed],
                fetchReply: true
            });
            
            // Add reaction emojis
            for (const emoji of reactionEmojis) {
                await pollMessage.react(emoji);
            }
            
            // Set up poll end timer if duration is set
            if (duration > 0) {
                setTimeout(async () => {
                    try {
                        // Fetch the message to get updated reactions
                        const message = await interaction.channel.messages.fetch(pollMessage.id);
                        
                        // Count reactions
                        const results = [];
                        
                        for (let i = 0; i < options.length; i++) {
                            const reaction = message.reactions.cache.get(reactionEmojis[i]);
                            // Subtract 1 to exclude the bot's reaction
                            const count = reaction ? (reaction.count - 1) : 0;
                            results.push({
                                option: options[i],
                                emoji: reactionEmojis[i],
                                votes: count
                            });
                        }
                        
                        // Sort by votes (highest first)
                        results.sort((a, b) => b.votes - a.votes);
                        
                        // Create results text
                        let resultsText = `**${question}**\n\n**Results:**\n`;
                        let totalVotes = 0;
                        
                        results.forEach(result => {
                            totalVotes += result.votes;
                        });
                        
                        results.forEach(result => {
                            const percentage = totalVotes > 0 ? Math.round((result.votes / totalVotes) * 100) : 0;
                            resultsText += `${result.emoji} ${result.option}: **${result.votes}** vote${result.votes !== 1 ? 's' : ''} (${percentage}%)\n`;
                        });
                        
                        if (totalVotes === 0) {
                            resultsText += '\nNo votes were cast in this poll.';
                        } else {
                            resultsText += `\n**Total Votes:** ${totalVotes}`;
                        }
                        
                        // Create results embed
                        const resultsEmbed = createEmbed({
                            title: '📊 Poll Results',
                            description: resultsText,
                            footer: 'Sierra Bot • Made with ❤️ by Axody',
                            timestamp: true
                        });
                        
                        // Edit the original message with results
                        await message.edit({ embeds: [resultsEmbed] });
                        
                        // Send a follow-up message mentioning the poll has ended
                        await interaction.followUp({
                            content: `📊 The poll "${question}" has ended! Check the results above.`,
                            allowedMentions: { parse: [] } // Don't ping anyone
                        });
                        
                    } catch (error) {
                        console.error('Error ending poll:', error);
                    }
                }, duration * 60000);
            }
            
        } catch (error) {
            console.error('Error in poll command:', error);
            return interaction.reply({
                content: '❌ There was an error creating the poll.',
                ephemeral: true
            });
        }
    }
}; 