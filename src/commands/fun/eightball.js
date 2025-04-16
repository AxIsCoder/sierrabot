const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES } = require('../../utils/constants');

// Magic 8-Ball responses
const RESPONSES = [
    // Positive answers
    { text: 'It is certain.', type: 'positive' },
    { text: 'It is decidedly so.', type: 'positive' },
    { text: 'Without a doubt.', type: 'positive' },
    { text: 'Yes, definitely.', type: 'positive' },
    { text: 'You may rely on it.', type: 'positive' },
    { text: 'As I see it, yes.', type: 'positive' },
    { text: 'Most likely.', type: 'positive' },
    { text: 'Outlook good.', type: 'positive' },
    { text: 'Yes.', type: 'positive' },
    { text: 'Signs point to yes.', type: 'positive' },
    
    // Neutral answers
    { text: 'Reply hazy, try again.', type: 'neutral' },
    { text: 'Ask again later.', type: 'neutral' },
    { text: 'Better not tell you now.', type: 'neutral' },
    { text: 'Cannot predict now.', type: 'neutral' },
    { text: 'Concentrate and ask again.', type: 'neutral' },
    
    // Negative answers
    { text: 'Don\'t count on it.', type: 'negative' },
    { text: 'My reply is no.', type: 'negative' },
    { text: 'My sources say no.', type: 'negative' },
    { text: 'Outlook not so good.', type: 'negative' },
    { text: 'Very doubtful.', type: 'negative' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eightball')
        .setDescription('Ask the Magic 8-Ball a question')
        .addStringOption(option => 
            option.setName('question')
                .setDescription('The question you want to ask')
                .setRequired(true)),
    category: CATEGORIES.FUN,
    async execute(interaction) {
        // Get the question
        const question = interaction.options.getString('question');
        
        // Get a random response
        const response = RESPONSES[Math.floor(Math.random() * RESPONSES.length)];
        
        // Determine emoji and color based on response type
        let emoji, color;
        
        switch (response.type) {
            case 'positive':
                emoji = '✅';
                color = '#43B581'; // Discord green
                break;
            case 'neutral':
                emoji = '❓';
                color = '#FAA61A'; // Discord yellow
                break;
            case 'negative':
                emoji = '❌';
                color = '#F04747'; // Discord red
                break;
            default:
                emoji = '🎱';
                color = '#7289DA'; // Discord blurple
        }
        
        // Create the embed
        const embed = createEmbed({
            title: '🎱 Magic 8-Ball',
            description: `**Question:** ${question}`,
            fields: [
                {
                    name: 'Answer',
                    value: `${emoji} ${response.text}`
                }
            ],
            footer: 'Sierra Bot • Made with ❤️ by Axody',
            timestamp: true
        });
        
        // Override the default embed color with response-specific color
        embed.setColor(color);
        
        // Send the response
        await interaction.reply({ embeds: [embed] });
    }
}; 