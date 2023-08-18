import axios, { AxiosResponse } from "axios";
import { CommandInterface } from "../interfaces/Command";
import { ButtonStyle, SlashCommandBuilder } from "discord.js";
import { broadcastCommandFailed } from "../utils/commandUtils";
import { TMDBAPI, getMovie, getMovieDetails, tmdbDetailType, tmdbResponseType, tmdbResultType } from "../api/tmdbAPI";
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, MessageActionRowComponentBuilder } from "@discordjs/builders";

export const movie: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('movie')
        .setDescription('Get information about a movie')
        .addStringOption((option) =>
            option
                .setName('query')
                .setDescription('The movie to search for')
                .setRequired(true)
        ),
    run: async (interaction) => {
        if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.guild || !interaction.channel) {
            await broadcastCommandFailed(interaction, "Interaction is NOT poggers!");
            return;
        }
        const results: tmdbResponseType = await getMovie(interaction.options.getString('query'));
        if (!results || results.total_results == 0) {
            await interaction.editReply('No results found!');
            return;
        } else {
            console.debug(`Found ${results.total_results}`)

            const embed = new EmbedBuilder();
                

            const topResult: tmdbResultType = results.results[0];

            // Get movie details
            const details: tmdbDetailType = await getMovieDetails(topResult.id);

            // Title and year
            let title = topResult.title + " (" + topResult.release_date.substring(0, 4) + ")";
            if (topResult.title != topResult.original_title) {
                title += " [" + topResult.original_title + "]";
            }

            embed.setTitle(title);

            // Description
            let description = "";
            if (details.tagline) description += `*"${details.tagline}"*\n`;
            description += topResult.overview;

            // Production Companies
            let productionCompaniesString = "";
            if (details.production_companies.length > 0) {
                let companies: string[] = [];
                for (const company of details.production_companies) {
                    companies.push(company.name);
                }
                if (details.production_companies.length == 2) {
                    productionCompaniesString += companies.join(" and ");
                } else {
                    productionCompaniesString += companies.join(", ");
                }
            }

            if (productionCompaniesString.length > 0) description += `\n\n \\- *${productionCompaniesString}*`;
            

            // Links
            const row: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();

            if (details.imdb_id) {
                const imdbButton = new ButtonBuilder()
                    .setLabel("IMDb")
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://www.imdb.com/title/${details.imdb_id}`);
                row.addComponents(imdbButton);
            }
            if (details.homepage) {
                const homepageButton = new ButtonBuilder()
                    .setLabel("Homepage")
                    .setStyle(ButtonStyle.Link)
                    .setURL(details.homepage);
                row.addComponents(homepageButton);
            }
            const moviedbButton = new ButtonBuilder()
                .setLabel("TMDb")
                .setStyle(ButtonStyle.Link)
                .setURL(`https://www.themoviedb.org/movie/${topResult.id}`);
            row.addComponents(moviedbButton);

            const incorrectButton = new ButtonBuilder()
                .setCustomId("incorrect")
                .setLabel("Incorrect Result?")
                .setStyle(ButtonStyle.Danger);
            row.addComponents(incorrectButton);

            // Genres
            let genreString = "";
            // Get genres
            if (topResult.genre_ids && details.genres.length > 0) {
                let genres: string[] = [];
                for (const genre of details.genres) {
                    genres.push(genre.name);
                }
                genreString += genres.join(", ");
            }

            // Stats
            let statsString = "";
            if (topResult.release_date) statsString += `\n**Released:** ${topResult.release_date}`
            if (details.runtime) statsString += `\n**Runtime:** ${details.runtime} minutes`;
            if (details.budget) statsString += `\n**Budget:** $${details.budget.toLocaleString()}`;
            if (details.revenue) statsString += `\n**Revenue:** $${details.revenue.toLocaleString()}`;
            

            // Ratings
            let ratingString = "";
            if (topResult.vote_average) {
                const numStars = Math.round(topResult.vote_average / 2);
                ratingString += `${"★".repeat(numStars)} ${"☆".repeat(5 - numStars)}`;
                ratingString += `\n${topResult.vote_average.toFixed(2)}/10 - ${topResult.vote_count} votes`;
            }
            if (ratingString.length == 0) {
                ratingString += "No scores available";
            }

            if (statsString.length > 0) embed.addFields({ name: "Info", value: statsString, inline: true });
            if (genreString.length > 0) embed.addFields({ name: "Genres", value: genreString, inline: true });
            if (ratingString.length > 0) embed.addFields({ name: "Rating", value: ratingString, inline: true });

            const adult: boolean = topResult.adult;
            if (adult) description += "\n**WARNING: This movie is NSFW, so no poster is shown.**";
            if (TMDBAPI.formCdnURL && !adult) {
                embed.setImage(await TMDBAPI.formCdnURL() + "/w500/" +topResult.poster_path);
            }
            embed.setFooter({ text: "Source: The Movie Database", iconURL: "https://www.themoviedb.org/assets/2/apple-touch-icon-57ed4b3b0450fd5e9a0c20f34e814b82adaa1085c79bdde2f00ca8787b63d2c4.png"})
            embed.setDescription(description);
            const response = await interaction.editReply({ embeds: [embed], components: [row] });

            const collectorFilter = (i: { user: { id: string; }; }) => i.user.id === interaction.user.id;

            try {
                const buttonResponse = await response.awaitMessageComponent({ filter: collectorFilter, time: 60000 });
                // If calling user is the one who clicked the button
                if (buttonResponse.customId === 'incorrect' && buttonResponse.user == interaction.user) {
                    // Delete original
                    await buttonResponse.deferUpdate();
                    await interaction.deleteReply();
                    await buttonResponse.followUp({ content: `too bad lol`, components: [] });
                } 
            } catch (e) { }

            return;
        }

    },
    properties: {
        Name: "movie",
        Aliases: [],
        Scope: "global",
        GuildOnly: false,
        Enabled: true,
        DefaultEnabled: true,
        CanBeDisabled: true,
        Intents: [],
        Permissions: [],
        Ephemeral: false,
    }
}