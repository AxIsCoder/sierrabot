const { SlashCommandBuilder } = require('discord.js');
const { createEmbed } = require('../../utils/embedCreator');
const { CATEGORIES, BOT_NAME } = require('../../utils/constants');

// Emojis for rock, paper, scissors
const ROCK_EMOJI = '🪨';
const PAPER_EMOJI = '📄';
const SCISSORS_EMOJI = '✂️';

// Game choices
const CHOICES = ['rock', 'paper', 'scissors'];

// Choice details with emojis and win conditions
const CHOICE_DETAILS = {
    rock: {
        emoji: ROCK_EMOJI,
        beats: 'scissors',
        message: 'Rock smashes scissors!'
    },
    paper: {
        emoji: PAPER_EMOJI,
        beats: 'rock',
        message: 'Paper covers rock!'
    },
    scissors: {
        emoji: SCISSORS_EMOJI,
        beats: 'paper',
        message: 'Scissors cut paper!'
    }
};

/**
 * Get a random choice for the bot
 * @returns {string} Random choice (rock, paper, or scissors)
 */
function getBotChoice() {
    const randomIndex = Math.floor(Math.random() * CHOICES.length);
    return CHOICES[randomIndex];
}

/**
 * Determine the winner of the RPS game
 * @param {string} userChoice - User's choice
 * @param {string} botChoice - Bot's choice
 * @returns {object} Result object with winner and message
 */
function determineWinner(userChoice, botChoice) {
    // Check for tie
    if (userChoice === botChoice) {
        return {
            result: 'tie',
            message: "It's a tie!"
        };
    }
    
    // Check if user wins
    if (CHOICE_DETAILS[userChoice].beats === botChoice) {
        return {
            result: 'user',
            message: CHOICE_DETAILS[userChoice].message
        };
    }
    
    // Bot wins
    return {
        result: 'bot',
        message: CHOICE_DETAILS[botChoice].message
    };
}

/**
 * Compact error handling function to log errors without full stack traces
 * @param {Error} error - The error object
 * @param {string} context - Context for the error
 */
function handleError(error, context) {
    if (error.code) {
        // For Discord API errors, just log a compact message
        console.log(`[ERROR] ${context}: ${error.code} - ${error.message || 'Unknown error'}`);
    } else {
        // For other errors, log a bit more info but still keep it compact
        console.log(`[ERROR] ${context}: ${error.message || error}`);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Play Rock Paper Scissors against the bot')
        .addStringOption(option => 
            option.setName('choice')
                .setDescription('Your choice: rock, paper, or scissors')
                .setRequired(true)
                .addChoices(
                    { name: `${ROCK_EMOJI} Rock`, value: 'rock' },
                    { name: `${PAPER_EMOJI} Paper`, value: 'paper' },
                    { name: `${SCISSORS_EMOJI} Scissors`, value: 'scissors' }
                )),
    category: CATEGORIES.FUN,
    async execute(interaction) {
        // Flag to track if we have responded
        let hasResponded = false;
        
        try {
            // Get user's choice
            const userChoice = interaction.options.getString('choice');
            
            // Get bot's choice
            const botChoice = getBotChoice();
            
            // Determine the winner
            const gameResult = determineWinner(userChoice, botChoice);
            
            // Get emojis for choices
            const userEmoji = CHOICE_DETAILS[userChoice].emoji;
            const botEmoji = CHOICE_DETAILS[botChoice].emoji;
            
            // Create title based on result
            let title = '';
            if (gameResult.result === 'tie') {
                title = "🤝 It's a Tie!";
            } else if (gameResult.result === 'user') {
                title = "🎉 You Win!";
            } else {
                title = "😔 Bot Wins!";
            }
            
            // Create description showing the choices and result
            const description = `
**Your choice:** ${userEmoji} ${userChoice.charAt(0).toUpperCase() + userChoice.slice(1)}
**Bot's choice:** ${botEmoji} ${botChoice.charAt(0).toUpperCase() + botChoice.slice(1)}

${gameResult.message}`;
            
            // Create the embed
            const embed = createEmbed({
                title: title,
                description: description,
                footer: `${BOT_NAME} • Rock Paper Scissors`,
                timestamp: true
            });
            
            // Only reply if we haven't already
            if (!hasResponded) {
                await interaction.reply({ embeds: [embed] });
                hasResponded = true;
            }
            
        } catch (error) {
            handleError(error, 'RPS command');
            
            try {
                // Only try to reply if we haven't already
                if (!hasResponded && !interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'There was an error playing Rock Paper Scissors. Please try again later.',
                        ephemeral: true
                    });
                    hasResponded = true;
                }
            } catch (replyError) {
                handleError(replyError, 'RPS error response');
            }
        }
    }
}; 