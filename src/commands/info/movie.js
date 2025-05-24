const { SlashCommandBuilder } = require('discord.js');
const { CATEGORIES } = require('../../utils/constants');
const { createEmbed } = require('../../utils/embedCreator');
const axios = require('axios');

// TMDB API configuration
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('movie')
        .setDescription('Get information about a movie')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of the movie to search for')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('year')
                .setDescription('The release year (optional, helps with accuracy)')
                .setRequired(false)),
    category: CATEGORIES.INFO,
    async execute(interaction) {
        try {
            // Check if TMDB API key is configured
            if (!TMDB_API_KEY) {
                return interaction.reply({
                    content: '❌ Movie information service is not configured. Please contact the bot administrator.',
                    ephemeral: true
                });
            }

            const title = interaction.options.getString('title');
            const year = interaction.options.getString('year');

            // Show searching message
            await interaction.deferReply();

            // Search for the movie
            const searchResponse = await axios.get(`${TMDB_BASE_URL}/search/movie`, {
                params: {
                    api_key: TMDB_API_KEY,
                    query: title,
                    year: year,
                    language: 'en-US',
                    include_adult: false
                }
            });

            if (!searchResponse.data.results.length) {
                return interaction.editReply({
                    content: `❌ No movies found matching "${title}"${year ? ` from ${year}` : ''}.`
                });
            }

            // Get the first result
            const movie = searchResponse.data.results[0];

            // Get detailed movie information
            const detailsResponse = await axios.get(`${TMDB_BASE_URL}/movie/${movie.id}`, {
                params: {
                    api_key: TMDB_API_KEY,
                    language: 'en-US',
                    append_to_response: 'credits,videos'
                }
            });

            const movieDetails = detailsResponse.data;

            // Format runtime
            const runtime = movieDetails.runtime 
                ? `${Math.floor(movieDetails.runtime / 60)}h ${movieDetails.runtime % 60}m`
                : 'Unknown';

            // Format release date
            const releaseDate = movieDetails.release_date
                ? new Date(movieDetails.release_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
                : 'Unknown';

            // Get director
            const director = movieDetails.credits.crew.find(person => person.job === 'Director');
            const directorName = director ? director.name : 'Unknown';

            // Get top 3 cast members
            const topCast = movieDetails.credits.cast
                .slice(0, 3)
                .map(actor => actor.name)
                .join(', ');

            // Get trailer if available
            const trailer = movieDetails.videos.results.find(video => 
                video.type === 'Trailer' && video.site === 'YouTube'
            );

            // Create the embed
            const embed = createEmbed({
                title: `${movieDetails.title} ${movieDetails.release_date ? `(${movieDetails.release_date.split('-')[0]})` : ''}`,
                description: movieDetails.overview || 'No overview available.',
                color: 0x00BFFF,
                thumbnail: movieDetails.poster_path 
                    ? `${TMDB_IMAGE_BASE_URL}/w500${movieDetails.poster_path}`
                    : null,
                fields: [
                    {
                        name: '📅 Release Date',
                        value: releaseDate,
                        inline: true
                    },
                    {
                        name: '⭐ Rating',
                        value: `${movieDetails.vote_average.toFixed(1)}/10 (${movieDetails.vote_count} votes)`,
                        inline: true
                    },
                    {
                        name: '⏱️ Runtime',
                        value: runtime,
                        inline: true
                    },
                    {
                        name: '🎬 Director',
                        value: directorName,
                        inline: true
                    },
                    {
                        name: '🎭 Top Cast',
                        value: topCast || 'Unknown',
                        inline: true
                    },
                    {
                        name: '🌍 Language',
                        value: movieDetails.original_language.toUpperCase(),
                        inline: true
                    }
                ],
                footer: 'Powered by The Movie Database (TMDB)'
            });

            // Add genres if available
            if (movieDetails.genres && movieDetails.genres.length) {
                embed.addFields({
                    name: '🎭 Genres',
                    value: movieDetails.genres.map(genre => genre.name).join(', '),
                    inline: false
                });
            }

            // Add trailer link if available
            if (trailer) {
                embed.addFields({
                    name: '🎥 Trailer',
                    value: `[Watch on YouTube](https://www.youtube.com/watch?v=${trailer.key})`,
                    inline: false
                });
            }

            // Add TMDB link
            embed.addFields({
                name: '🔗 More Info',
                value: `[View on TMDB](https://www.themoviedb.org/movie/${movieDetails.id})`,
                inline: false
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in movie command:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'An error occurred while fetching movie information.',
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: 'An error occurred while fetching movie information.'
                });
            }
        }
    }
}; 