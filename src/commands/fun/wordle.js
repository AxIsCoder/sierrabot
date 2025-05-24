const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ComponentType } = require('discord.js');
const { CATEGORIES } = require('../../utils/constants');
const { createEmbed } = require('../../utils/embedCreator');
const fs = require('fs');
const path = require('path');

// Word lists
const WORD_LIST_PATH = path.join(__dirname, '../../data/wordle/words.json');
const VALID_WORDS_PATH = path.join(__dirname, '../../data/wordle/valid-words.json');

// Load word lists
let wordList = [];
let validWords = [];

try {
    wordList = JSON.parse(fs.readFileSync(WORD_LIST_PATH, 'utf8'));
    validWords = JSON.parse(fs.readFileSync(VALID_WORDS_PATH, 'utf8'));
} catch (error) {
    console.error('Error loading word lists:', error);
}

// Game state storage
const games = new Map();

// Emoji representations
const EMOJIS = {
    CORRECT: '🟩',
    PRESENT: '🟨',
    ABSENT: '⬛',
    // KEYBOARD emojis are no longer needed for text input
};

// Keyboard layout is no longer needed for text input
// const KEYBOARD_BUTTONS = [
//     'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
//     'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L',
//     'Z', 'X', 'C', 'V', 'B', 'N', 'M'
// ];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wordle')
        .setDescription('Play a game of Wordle')
        .addIntegerOption(option =>
            option.setName('length')
                .setDescription('Word length (4-8 letters)')
                .setMinValue(4)
                .setMaxValue(8) 
                .setRequired(false)),
    category: CATEGORIES.FUN,
    async execute(interaction) {
        try {
            // Check if the user is already in a game
            if (games.has(interaction.user.id)) {
                return interaction.reply({
                    content: '❌ You are already in a game! Finish or give up your current game before starting a new one.',
                    ephemeral: true
                });
            }

            const wordLength = interaction.options.getInteger('length') || 5;
            
            // Validate word length
            if (wordLength < 4 || wordLength > 8) {
                return interaction.reply({
                    content: '❌ Word length must be between 4 and 8 letters.',
                    ephemeral: true
                });
            }

            // Get a random word of the specified length
            const possibleWords = wordList.filter(word => word.length === wordLength);
            if (possibleWords.length === 0) {
                return interaction.reply({
                    content: `❌ No words available for length ${wordLength}. Please try a different length.`,
                    ephemeral: true
                });
            }

            const targetWord = possibleWords[Math.floor(Math.random() * possibleWords.length)];
            
            // Initialize game state
            const gameState = {
                targetWord,
                guesses: [],
                startTime: Date.now(),
                interaction
            };

            // Store game state
            games.set(interaction.user.id, gameState);

            // Create initial game board embed
            const boardEmbed = createGameBoard(gameState);

            // Send initial game message (visible to everyone)
            const gameMessage = await interaction.reply({
                embeds: [boardEmbed],
                fetchReply: true,
                ephemeral: false // Make the message visible to everyone
            });

            // Remove the follow-up message prompt - user will reply directly to the embed
            // await interaction.followUp({
            //     content: `Type your ${wordLength}-letter guess in this channel. You have 6 attempts. Type 'giveup' to end the game.`, 
            //     ephemeral: true
            // });

            // Create a message collector to listen for replies to the game message
            const filter = m => m.author.id === interaction.user.id && m.channel.id === interaction.channel.id && m.reference && m.reference.messageId === gameMessage.id;
            const collector = interaction.channel.createMessageCollector({
                filter,
                time: 300000, // 5 minutes timeout
                max: 6 // Maximum 6 guesses
            });

            collector.on('collect', async m => {
                const gameState = games.get(interaction.user.id);
                if (!gameState) {
                    collector.stop();
                    return;
                }

                const guess = m.content.toLowerCase().trim();

                // Handle 'giveup' command
                if (guess === 'giveup') {
                    collector.stop();
                    await endGame(interaction, gameState, false, gameMessage);
                    await m.delete().catch(() => {}); // Delete the 'giveup' message
                    return;
                }

                // Validate guess length
                if (guess.length !== gameState.targetWord.length) {
                    // Send a public reply to the user's guess indicating the incorrect length
                    await m.reply({
                        content: `❌ Your guess must be exactly ${gameState.targetWord.length} letters long.`, 
                        allowedMentions: { repliedUser: false } // Prevent mentioning the user
                    }).then(replyMsg => {
                         // Optionally delete this reply after a few seconds to keep chat clean
                         setTimeout(() => replyMsg.delete().catch(() => {}), 5000);
                    });
                    await m.delete().catch(() => {});
                    return;
                }

                // Validate if the guess is a valid word
                 if (!validWords.includes(guess)) {
                    // Send a public reply to the user's guess indicating the invalid word
                     await m.reply({
                        content: `❌ '${guess}' is not in the word list. Try a different word.`, 
                        allowedMentions: { repliedUser: false } // Prevent mentioning the user
                    }).then(replyMsg => {
                         // Optionally delete this reply after a few seconds to keep chat clean
                         setTimeout(() => replyMsg.delete().catch(() => {}), 5000);
                    });
                    await m.delete().catch(() => {});
                    return;
                }

                // Process guess
                const result = processGuess(guess, gameState.targetWord);
                gameState.guesses.push(result);

                // Update game board embed
                const updatedBoardEmbed = createGameBoard(gameState);

                // Edit the original game message with the updated board
                await gameMessage.edit({ embeds: [updatedBoardEmbed] });

                // Delete the user's guess message to keep the channel clean
                await m.delete().catch(() => {});

                // Check win condition
                if (guess === gameState.targetWord.toLowerCase()) {
                    collector.stop();
                    await endGame(interaction, gameState, true, gameMessage);
                    return;
                }

                // Check lose condition (handled by collector max limit)
                 if (gameState.guesses.length >= 6) {
                     collector.stop();
                     // The 'end' event handler will be triggered
                 }
            });

            collector.on('end', async (collected, reason) => {
                const gameState = games.get(interaction.user.id);
                if (!gameState) return; // Game already ended by giveup or win

                // Check if the game ended by winning, otherwise it's a loss (time or limit)
                const won = gameState.guesses.some(guess => guess.map(letter => letter.letter.toLowerCase()).join('') === gameState.targetWord.toLowerCase());

                if (!won) {
                    let endReason = '';
                    if (reason === 'time') {
                        endReason = 'timed out';
                    } else if (reason === 'limit') {
                        endReason = 'ran out of guesses';
                    }
                     await endGame(interaction, gameState, false, gameMessage, endReason);
                } else {
                     // Game already ended by winning, endGame was called in the collect handler
                }

                 // Clean up game state
                 games.delete(interaction.user.id);
            });

        } catch (error) {
            console.error('Error in wordle command:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: 'An error occurred while starting the game.',
                    ephemeral: true
                });
            }
        }
    }
};

function createGameBoard(gameState) {
    const rows = [];
    for (let i = 0; i < 6; i++) {
        if (i < gameState.guesses.length) {
            // Show completed guess
            rows.push(gameState.guesses[i].map(letter => letter.emoji).join(''));
        } else {
            // Show empty row
            rows.push('⬛'.repeat(gameState.targetWord.length));
        }
    }

    const boardRepresentation = rows.join('\n');
    
    const instructions = 
        `Guess the hidden word in 6 tries.\n` +
        `Reply to this message with your **${gameState.targetWord.length}-letter** guess.\n\n` +
        `Type \`giveup\` as a reply to end the game.`;

    const description = instructions + '\n\n' + boardRepresentation;
    const footer = `Word length: ${gameState.targetWord.length} | Guesses: ${gameState.guesses.length}/6`;

    return createEmbed({
        title: 'Wordle',
        description: description,
        color: 0x00FF00,
        footer: footer
    });
}

function processGuess(guess, target) {
    const result = [];
    const targetLetters = target.toLowerCase().split('');
    const guessLetters = guess.toLowerCase().split('');

    // First pass: mark correct letters
    for (let i = 0; i < guessLetters.length; i++) {
        if (guessLetters[i] === targetLetters[i]) {
            result.push({ letter: guess[i], emoji: EMOJIS.CORRECT });
            targetLetters[i] = null;
        } else {
            result.push({ letter: guess[i], emoji: null });
        }
    }

    // Second pass: mark present and absent letters
    for (let i = 0; i < guessLetters.length; i++) {
        if (result[i].emoji === null) {
            const index = targetLetters.indexOf(guessLetters[i]);
            if (index !== -1) {
                result[i].emoji = EMOJIS.PRESENT;
                targetLetters[index] = null;
            } else {
                result[i].emoji = EMOJIS.ABSENT;
            }
        }
    }

    return result;
}

// Keyboard state functions are no longer needed
// function updateKeyboardState(gameState, guessResult) {
//     guessResult.forEach(({ letter, emoji }) => {
//         const key = letter.toUpperCase();
//         if (emoji === EMOJIS.CORRECT) {
//             gameState.keyboardState[key] = EMOJIS.CORRECT;
//         } else if (emoji === EMOJIS.PRESENT && gameState.keyboardState[key] !== EMOJIS.CORRECT) {
//             gameState.keyboardState[key] = EMOJIS.PRESENT;
//         } else if (emoji === EMOJIS.ABSENT && gameState.keyboardState[key] === '⬛') {
//             gameState.keyboardState[key] = EMOJIS.ABSENT;
//         }
//     });
// }

// function getButtonStyle(state) {
//     switch (state) {
//         case EMOJIS.CORRECT:
//             return ButtonStyle.Success;
//         case EMOJIS.PRESENT:
//             return ButtonStyle.Primary;
//         case EMOJIS.ABSENT:
//             return ButtonStyle.Secondary;
//         default:
//             return ButtonStyle.Secondary;
//     }
// }

async function endGame(interaction, gameState, won, gameMessage, reason = '') {
    const timeSpent = Math.floor((Date.now() - gameState.startTime) / 1000);
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;

    let description = `The word was: **${gameState.targetWord.toUpperCase()}**\nTime: ${minutes}m ${seconds}s`;
    if (reason) {
        description = `Game ended because you ${reason}.\n${description}`;
    }

    const embed = createEmbed({
        title: won ? '🎉 You Won!' : 'Game Over',
        description: description,
        color: won ? 0x00FF00 : 0xFF0000,
        fields: [
            {
                name: 'Guesses',
                value: gameState.guesses.length > 0 ? gameState.guesses.map(guess => guess.map(letter => letter.emoji).join('')).join('\n') : 'No guesses made.',
                inline: false
            }
        ],
        footer: 'Use /wordle to play again!'
    });

    try {
        // Edit the original game message to show the final result
        await gameMessage.edit({
            embeds: [embed],
            components: [] // Remove components if any were left
        });
    } catch (error) {
        console.error('Error ending game:', error);
    }

    // Remove game from state
    games.delete(interaction.user.id);
} 