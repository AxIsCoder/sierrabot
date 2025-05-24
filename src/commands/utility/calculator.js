const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { CATEGORIES } = require('../../utils/constants');
const { createEmbed } = require('../../utils/embedCreator');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('calculator')
        .setDescription('Open an interactive calculator'),
    category: CATEGORIES.UTILITY,
    async execute(interaction) {
        try {
            // Create the calculator display
            let currentExpression = '';
            let result = '0';

            // Create the calculator embed
            const embed = createEmbed({
                title: '🖩 Calculator',
                description: '```\n' + result.padStart(20) + '\n```',
                color: 0x0099FF,
                footer: 'Click the buttons to calculate'
            });

            // Create number buttons (0-9)
            const numberButtons = [
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('7').setLabel('7').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('8').setLabel('8').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('9').setLabel('9').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('divide').setLabel('÷').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('clear').setLabel('C').setStyle(ButtonStyle.Danger)
                    ),
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('4').setLabel('4').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('5').setLabel('5').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('6').setLabel('6').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('multiply').setLabel('×').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('backspace').setLabel('⌫').setStyle(ButtonStyle.Danger)
                    ),
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('1').setLabel('1').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('2').setLabel('2').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('3').setLabel('3').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('subtract').setLabel('-').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('equals').setLabel('=').setStyle(ButtonStyle.Success)
                    ),
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('0').setLabel('0').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('decimal').setLabel('.').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('percent').setLabel('%').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('add').setLabel('+').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('close').setLabel('Close').setStyle(ButtonStyle.Danger)
                    )
            ];

            // Send the initial calculator message
            const calculatorMessage = await interaction.reply({
                embeds: [embed],
                components: numberButtons,
                ephemeral: true
            });

            // Create button collector
            const collector = calculatorMessage.createMessageComponentCollector({
                time: 300000 // 5 minutes
            });

            // Handle button interactions
            collector.on('collect', async (i) => {
                // Only allow the user who started the calculator to use it
                if (i.user.id !== interaction.user.id) {
                    await i.reply({ content: 'This calculator is not for you!', ephemeral: true });
                    return;
                }

                const buttonId = i.customId;

                // Handle different button types
                switch (buttonId) {
                    case 'close':
                        collector.stop();
                        try {
                            await i.update({
                                embeds: [createEmbed({
                                    title: '🖩 Calculator',
                                    description: '```\nCalculator closed\n```',
                                    color: 0x0099FF
                                })],
                                components: []
                            });
                        } catch (error) {
                            // If the interaction has expired, try to edit the original message
                            if (error.code === 10062) {
                                try {
                                    await interaction.editReply({
                                        embeds: [createEmbed({
                                            title: '🖩 Calculator',
                                            description: '```\nCalculator closed\n```',
                                            color: 0x0099FF
                                        })],
                                        components: []
                                    });
                                } catch (editError) {
                                    console.error('Error editing calculator message:', editError);
                                }
                            }
                        }
                        return;

                    case 'clear':
                        currentExpression = '';
                        result = '0';
                        break;

                    case 'backspace':
                        currentExpression = currentExpression.slice(0, -1);
                        result = currentExpression || '0';
                        break;

                    case 'equals':
                        try {
                            // Replace × with * and ÷ with / for evaluation
                            const evalExpression = currentExpression
                                .replace(/×/g, '*')
                                .replace(/÷/g, '/');
                            result = eval(evalExpression).toString();
                            currentExpression = result;
                        } catch (error) {
                            result = 'Error';
                            currentExpression = '';
                        }
                        break;

                    case 'percent':
                        try {
                            const evalExpression = currentExpression
                                .replace(/×/g, '*')
                                .replace(/÷/g, '/');
                            result = (eval(evalExpression) / 100).toString();
                            currentExpression = result;
                        } catch (error) {
                            result = 'Error';
                            currentExpression = '';
                        }
                        break;

                    default:
                        // Handle numbers and operators
                        if (['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '+', '-', '×', '÷'].includes(buttonId)) {
                            currentExpression += buttonId;
                            result = currentExpression;
                        }
                }

                // Update the calculator display
                const updatedEmbed = createEmbed({
                    title: '🖩 Calculator',
                    description: '```\n' + result.padStart(20) + '\n```',
                    color: 0x0099FF,
                    footer: 'Click the buttons to calculate'
                });

                try {
                    await i.update({
                        embeds: [updatedEmbed],
                        components: numberButtons
                    });
                } catch (error) {
                    if (error.code === 10062) {
                        // Interaction expired, try to edit the original message
                        try {
                            await interaction.editReply({
                                embeds: [updatedEmbed],
                                components: numberButtons
                            });
                        } catch (editError) {
                            console.error('Error editing calculator message:', editError);
                        }
                    }
                }
            });

            // Handle collector end
            collector.on('end', async () => {
                try {
                    await interaction.editReply({
                        components: [],
                        embeds: [createEmbed({
                            title: '🖩 Calculator',
                            description: '```\nCalculator closed\n```',
                            color: 0x0099FF
                        })]
                    });
                } catch (error) {
                    console.error('Error closing calculator:', error);
                }
            });

        } catch (error) {
            console.error('Error in calculator command:', error);
            if (!interaction.replied) {
                await interaction.reply({
                    content: 'An error occurred while creating the calculator.',
                    ephemeral: true
                });
            }
        }
    }
}; 