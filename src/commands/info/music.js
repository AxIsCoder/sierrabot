const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { CATEGORIES } = require('../../utils/constants');
const { createEmbed } = require('../../utils/embedCreator');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('Find information about music (artists, tracks).')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The artist or track name to search for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Search for artist or track (default: track)')
                .addChoices(
                    { name: 'Artist', value: 'artist' },
                    { name: 'Track', value: 'track' }
                )),
    category: CATEGORIES.INFO,
    async execute(interaction) {
        const query = interaction.options.getString('query');
        const type = interaction.options.getString('type') || 'track';
        const lastfmApiKey = process.env.LASTFM_API_KEY; // Requires Last.fm API key

        if (!lastfmApiKey) {
            return interaction.reply({
                content: '❌ Last.fm API key is not configured. Please set the LASTFM_API_KEY in the .env file.',
                ephemeral: true
            });
        }

        try {
            let apiUrl;
            let embedTitle;
            let noResultsMessage;

            if (type === 'artist') {
                apiUrl = `http://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(query)}&api_key=${lastfmApiKey}&format=json`;
                embedTitle = '🎶 Artist Info';
                noResultsMessage = `❌ Could not find any artist matching '${query}'.`;
            } else {
                // Default to track search
                apiUrl = `http://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${lastfmApiKey}&format=json`;
                embedTitle = '🎵 Track Info';
                noResultsMessage = `❌ Could not find any track matching '${query}'.`;
            }

            const response = await fetch(apiUrl);
            const data = await response.json();

            let result;

            if (type === 'artist') {
                 if (!data.results || !data.results.artistmatches || data.results.artistmatches.artist.length === 0) {
                     return interaction.reply({ content: noResultsMessage, ephemeral: true });
                 }
                 result = data.results.artistmatches.artist[0];
             } else {
                 if (!data.results || !data.results.trackmatches || data.results.trackmatches.track.length === 0) {
                     return interaction.reply({ content: noResultsMessage, ephemeral: true });
                 }
                 result = data.results.trackmatches.track[0];
             }

            const embed = createEmbed({
                title: embedTitle,
                description: type === 'artist' ? `**Artist:** ${result.name}` : `**Track:** ${result.name}\n**Artist:** ${result.artist}`,
                color: 0xFF00FF, // Purple color
                thumbnail: result.image && result.image[2]['#text'] ? { url: result.image[2]['#text'] } : null, // Use large image if available
                fields: [
                    // Add more fields based on the API response data if needed
                    // For track, you might add album, duration, etc.
                    // For artist, you might add genre, similar artists, etc.
                ],
                url: result.url, // Link to Last.fm page
                footer: 'Powered by Last.fm'
            });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error fetching music data:', error);
            await interaction.reply({
                content: '❌ An error occurred while fetching music data.',
                ephemeral: true
            });
        }
    },
}; 