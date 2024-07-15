import { CommandInterface } from "../../interfaces/Command.js";
import { ButtonStyle, Message, SlashCommandBuilder, User } from "discord.js";
import { CommandStatus, broadcastCommandStatus } from "../../utils/commandUtils.js";
import { TMDBAPI, getMovie, getMovieDetails, getMovieProviders, tmdbDetailType, tmdbResponseType, tmdbResultType } from "../../api/tmdbAPI.js";
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, MessageActionRowComponentBuilder } from "@discordjs/builders";
// @ts-ignore
import { default as config } from "../../config/config.json" assert { type: "json" };

const createEmbed = async (interaction: Message<boolean>, movie: tmdbResultType): Promise<Message<boolean>> => {
    const embed = new EmbedBuilder();
        

    const topResult: tmdbResultType = movie;

    // Get movie details
    const details: tmdbDetailType = await getMovieDetails(topResult.id);

    // Get movie providers  
    const providersResponse = await getMovieProviders(topResult.id);

    // Title and year
    let title = topResult.title + " (" + topResult.release_date.substring(0, 4) + ")";
    if (topResult.title != topResult.original_title) {
        title += " [" + topResult.original_title + "]";
    }


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
        if (config.movie.emojiIds.IMDb) {
            imdbButton.setEmoji({
                name: "IMDb",
                id: config.movie.emojiIds.IMDb
            });
        }
        row.addComponents(imdbButton);
    }
    const moviedbButton = new ButtonBuilder()
        .setLabel("TMDb")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://www.themoviedb.org/movie/${topResult.id}`);
    if (config.movie.emojiIds.TMDb) {
        moviedbButton.setEmoji({
            name: "TMDb",
            id: config.movie.emojiIds.TMDb
        });
    }
    row.addComponents(moviedbButton);

    if (details.homepage) {
        const homepageButton = new ButtonBuilder()
            .setLabel("Homepage")
            .setStyle(ButtonStyle.Link)
            .setURL(details.homepage);
        row.addComponents(homepageButton);
    }

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
    } else {
        genreString = "No data available.";
    }

    // Stats
    let statsString = "";
    if (topResult.release_date) statsString += `\n**Released:** ${topResult.release_date}`
    // Runtime
    let minutes = details.runtime;
    let hours = 0;
    while (minutes - 60 > 0) {
        hours++;
        minutes -= 60;
    }
    title += ` (${hours}h${minutes}m)`
    if (details.budget) statsString += `\n**Budget:** $${details.budget.toLocaleString()}`;
    if (details.revenue) statsString += `\n**Revenue:** $${details.revenue.toLocaleString()}`;
    

    // Ratings
    let ratingString = "";
    if (topResult.vote_average) {
        const numStars = Math.round(topResult.vote_average / 2);
        ratingString += `${"★".repeat(numStars)}${"☆".repeat(5 - numStars)}`;
        ratingString += `\n${topResult.vote_average.toFixed(2)}/10 - ${topResult.vote_count} votes`;
    }
    if (ratingString.length == 0) {
        ratingString += "No scores available";
    }

    if (statsString.length > 0) embed.addFields({ name: "Info", value: statsString, inline: true });
    if (genreString.length > 0) embed.addFields({ name: "Genres", value: genreString, inline: true });
    if (ratingString.length > 0) embed.addFields({ name: "Rating", value: ratingString, inline: true });

    // Movie Providers

    if(providersResponse != null) {
        // Stream
        let movieProvidersString = "";
        let buyProvidersString = "";
        let rentProvidersString = "";
        if (providersResponse.results != undefined && providersResponse.results.US != undefined) {
            const streamingProvidersList = providersResponse.results.US.flatrate;
            if(streamingProvidersList == undefined || streamingProvidersList.length == 0) {
                movieProvidersString = "None available.";
            } else {
                const providers = new Map<string, number>();
                for (const provider of streamingProvidersList) {
                    providers.set(provider.provider_name, provider.display_priority);
                }
                const sortedProviders = new Map([...providers.entries()].sort((a, b) => b[1] - a[1]));
                for (const [name, priority] of sortedProviders) {
                    movieProvidersString += `${name}, `;
                }
                movieProvidersString = movieProvidersString.slice(0,-2);
            }        
            // Buy
            
            const buyProvidersList = providersResponse.results.US.buy;
            if(buyProvidersList == undefined || buyProvidersList.length == 0) {
                buyProvidersString = "None available.";
            } else {
                const providers = new Map<string, number>();
                for (const provider of buyProvidersList) {
                    providers.set(provider.provider_name, provider.display_priority);
                }
                const sortedProviders = new Map([...providers.entries()].sort((a, b) => b[1] - a[1]));
                for (const [name, priority] of sortedProviders) {
                    buyProvidersString += `${name}, `;
                }
                buyProvidersString = buyProvidersString.slice(0,-2);
            }
        
            // Rent
            
            const rentProvidersList = providersResponse.results.US.rent;
            if(rentProvidersList == undefined || rentProvidersList.length == 0) {
                rentProvidersString = "None available.";
            } else {
                const providers = new Map<string, number>();
                for (const provider of rentProvidersList) {
                    providers.set(provider.provider_name, provider.display_priority);
                }
                const sortedProviders = new Map([...providers.entries()].sort((a, b) => b[1] - a[1]));
                for (const [name, priority] of sortedProviders) {
                    rentProvidersString += `${name}, `;
                }
                rentProvidersString = rentProvidersString.slice(0,-2);
            }
        } else {
            movieProvidersString = "None available.";
            buyProvidersString = "None available.";
            rentProvidersString = "None available.";
        }
        if (movieProvidersString.length > 0) embed.addFields({ name: "Stream it on", value: movieProvidersString, inline: true });
        if (buyProvidersString.length > 0) embed.addFields({ name: "Buy it on", value: buyProvidersString, inline: true });
        if (rentProvidersString.length > 0) embed.addFields({ name: "Rent it on", value: rentProvidersString, inline: true });

    }


    const adult: boolean = topResult.adult;
    if (adult) description += "\n**WARNING: This movie is NSFW, so no poster is shown.**";

    embed.setTitle(title);
    if (TMDBAPI.formCdnURL && !adult) {
        embed.setImage(await TMDBAPI.formCdnURL() + "/w500/" +topResult.poster_path);
    }
    embed.setFooter({ text: "Data: The Movie Database, Providers: JustWatch", iconURL: "https://www.themoviedb.org/assets/2/apple-touch-icon-57ed4b3b0450fd5e9a0c20f34e814b82adaa1085c79bdde2f00ca8787b63d2c4.png"})
    embed.setDescription(description);
    
    const response = await interaction.edit({ embeds: [embed], components: [row] });
    

    

    return response;
}

const sendEmbedAndCollectResponse = async (interaction: Message<boolean>, movie: tmdbResultType, results: tmdbResponseType, query: string, author: User): Promise<null> => {
    interaction.edit({ content: `Movie result for "${query}":` });
    const response: Message<boolean> = await createEmbed(interaction, movie);
    const collectorFilter = (i: { user: { id: string; }; }) => i.user.id === author.id;

    // Button responses
    try {
        const buttonResponse = await response.awaitMessageComponent({ filter: collectorFilter, time: 60000 });
        // If calling user is the one who clicked the button
        if (buttonResponse.customId === 'incorrect' && buttonResponse.user == author) {
            // Delete original
            await buttonResponse.deferUpdate();
            //await interaction.delete();

            let followUpString = "";
            if (results.results.length == 1) {
                followUpString = `I only found 1 result for "${query}". Make sure you spelled the title correctly!`;
            } else {
                let topTenResults = results.results;
                if (results.results.length > 10) {
                    followUpString += `I found ${results.results.length} results for "${query}". Here are the top 10.`;
                    topTenResults = topTenResults.slice(0, 10);
                } else {
                    followUpString += `I found ${results.results.length} results for "${query}".`;
                }

                followUpString += " Please send the number corresponding to the correct movie in chat and I'll fix up the result for you.";

                let counter = 1;
                for (const movie of topTenResults) {
                    followUpString += `\n${counter}. ${movie.title} ${ movie.release_date != undefined ? '(' + movie.release_date.substring(0, 4) + ')' : ''}`;
                    counter++;
                }
                followUpString += `\nWhen you're done, you can dismiss this message. You can also say "delete" and I'll delete the result.`;
            }

            const followUpMessage: Message<boolean> = await buttonResponse.followUp({ content: followUpString, components: [], ephemeral: true });
            if (results.results.length == 1) return null;
            // Collect chat responses
            const messageCollectorFilter = (m: Message<boolean>) => m.author.id === author.id;
            followUpMessage.channel.awaitMessages({ filter: messageCollectorFilter, max: 1, time: 30000, errors: ['time'] }).then(async collected => {
                const collectedMessage = collected.first();
                if(collectedMessage == undefined) return;

                if (collectedMessage.content == "delete") {
                    await collectedMessage.delete();
                    await buttonResponse.deleteReply();
                    return;
                } else {
                    if(Number.isNaN(Number(collectedMessage.content))) {
                    } else if (Number(collectedMessage.content) <= 0 || Number(collectedMessage.content) > results.results.length) {
                    } else {
                        collectedMessage.delete();
                        const selectedNumber: number = Number(collectedMessage.content);
                        const selectedMovie: tmdbResultType = results.results[selectedNumber - 1];
                        await sendEmbedAndCollectResponse(interaction, selectedMovie, results, query, author);
                        return;
                    }
                }
            }).catch(async (e) => {
                await buttonResponse.editReply("I ran into an error handling your reply.");
                console.error(e);
            });
        } 
    } catch (e) { }
    return null;
}

export const movie: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('movie')
        .setDescription('Get information about a movie')
        .addStringOption((option) =>
            option
                .setName('query')
                .setDescription('The movie to search for')
                .setRequired(true)
        )
        ,
    run: async (interaction) => {
        if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.guild || !interaction.channel) {
            await broadcastCommandStatus(interaction, CommandStatus.CriticallyFailed, {command: movie, reason: "Invalid interaction!"});
            return;
        }
        const query = interaction.options.getString('query');
        if (query == null) {
            await interaction.editReply(`Invalid query!`);
            return;
        } 
        
        const results: tmdbResponseType = await getMovie(query);
        if (results.total_results == 0) {
            await interaction.editReply('No results found!');
            return;
        } else if (!results) {
            await interaction.editReply(`TMDB API key is invalid, can't get any results :(`);
        } else {
            console.debug(`Found ${results.total_results}`)
            const message: Message<boolean> = await interaction.editReply("Finding your movie...");

            sendEmbedAndCollectResponse(message, results.results[0], results, query, interaction.user);
            
            return;
        }

    },
    properties: {
        Name: "Search Movie",
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