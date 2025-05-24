const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { CATEGORIES } = require('../../utils/constants');
const { createEmbed } = require('../../utils/embedCreator');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tv-show')
        .setDescription('Find information about a TV show')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of the TV show')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('year')
                .setDescription('The release year of the TV show')
                .setRequired(false)),
    category: CATEGORIES.INFO,
    async execute(interaction) {
        const tvShowTitle = interaction.options.getString('title');
        const tvShowYear = interaction.options.getInteger('year');
        const tmdbApiKey = process.env.TMDB_API_KEY;

        if (!tmdbApiKey) {
            return interaction.reply({
                content: '❌ TMDB API key is not configured. Please set the TMDB_API_KEY in the .env file.',
                ephemeral: true
            });
        }

        try {
            let apiUrl = `https://api.themoviedb.org/3/search/tv?api_key=${tmdbApiKey}&query=${encodeURIComponent(tvShowTitle)}`;
            if (tvShowYear) {
                apiUrl += `&first_air_date_year=${tvShowYear}`;
            }

            const searchResponse = await fetch(apiUrl);
            const searchData = await searchResponse.json();

            if (!searchData.results || searchData.results.length === 0) {
                return interaction.reply({
                    content: `❌ Could not find any TV show matching '${tvShowTitle}'${tvShowYear ? ` from ${tvShowYear}` : ''}.`, 
                    ephemeral: true
                });
            }

            // Get the first search result
            const tvShow = searchData.results[0];

            // Fetch detailed TV show information
            const tvShowDetailsUrl = `https://api.themoviedb.org/3/tv/${tvShow.id}?api_key=${tmdbApiKey}&append_to_response=credits`;
            const detailsResponse = await fetch(tvShowDetailsUrl);
            const detailsData = await detailsResponse.json();

            // Extract information
            const title = detailsData.name;
            const overview = detailsData.overview || 'No overview available.';
            const posterPath = detailsData.poster_path ? `https://image.tmdb.org/t/p/w500${detailsData.poster_path}` : null;
            const voteAverage = detailsData.vote_average ? detailsData.vote_average.toFixed(1) : 'N/A';
            const firstAirDate = detailsData.first_air_date || 'N/A';
            const genres = detailsData.genres.map(genre => genre.name).join(', ') || 'N/A';
            const creators = detailsData.created_by.map(creator => creator.name).join(', ') || 'N/A';
            const cast = detailsData.credits.cast.slice(0, 5).map(actor => actor.name).join(', ') || 'N/A'; // Top 5 cast members
            const numberOfSeasons = detailsData.number_of_seasons || 'N/A';
            const numberOfEpisodes = detailsData.number_of_episodes || 'N/A';
            const homepage = detailsData.homepage || null;
            const tmdbLink = `https://www.themoviedb.org/tv/${tvShow.id}`;


            const embed = createEmbed({
                title: title,
                description: overview,
                color: 0x00FF00,
                thumbnail: posterPath ? { url: posterPath } : null,
                fields: [
                    { name: 'Rating', value: voteAverage, inline: true },
                    { name: 'First Air Date', value: firstAirDate, inline: true },
                    { name: 'Genres', value: genres, inline: false },
                    { name: 'Creators', value: creators, inline: false },
                    { name: 'Top Cast', value: cast, inline: false },
                    { name: 'Seasons', value: numberOfSeasons.toString(), inline: true },
                    { name: 'Episodes', value: numberOfEpisodes.toString(), inline: true },
                    { name: 'TMDB Link', value: tmdbLink, inline: false }
                ].filter(field => field.value !== 'N/A'), // Filter out fields with N/A value
                 url: homepage || tmdbLink, // Link title to homepage if available, otherwise TMDB link
                 footer: 'Powered by The Movie Database (TMDB)'
            });

             await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error fetching TV show data:', error);
            await interaction.reply({
                content: 'An error occurred while fetching TV show data.',
                ephemeral: true
            });
        }
    }
}; 