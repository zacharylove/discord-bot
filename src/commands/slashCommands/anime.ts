import { CommandInterface } from "../../interfaces/Command.js";
import { ActionRowBuilder, ButtonStyle, Message, SlashCommandBuilder, User } from "discord.js";
import { CommandStatus, broadcastCommandStatus } from "../../utils/commandUtils.js";
import { ButtonBuilder, EmbedBuilder, MessageActionRowComponentBuilder } from "@discordjs/builders";
import { getAnime } from "../../api/jikanAPI.js";
// @ts-ignore
import { default as config } from "../../config/config.json" assert { type: "json" };

import { toTitleCase } from "../../utils/utils.js";
import { BOT } from "../../index.js";


export const createAnimeEmbed = async (interaction: Message<boolean>, anime: any, message?: string, isTrace: boolean = false): Promise<Message<boolean>> => {
    const embed = new EmbedBuilder();
    const topResult = anime;
    if (topResult == undefined) throw new Error('Undefined response!');

    const malURL: string = topResult.url;
    const defaultTitle: string = topResult.title;
    const engTitle: string = topResult.title_english;
    const showType: string = topResult.type;
    const status: string = topResult.status;
    const airFromDate: Date = new Date(topResult.aired.from);
    const airToDate: Date = new Date(topResult.aired.to);
    const score: number = topResult.score;
    const scoredby: number = topResult.scored_by;
    const rank: number = topResult.rank;
    const popularity: number = topResult.popularity;
    const synopsis: string = topResult.synopsis;
    const season: string = topResult.season;
    const year: number = topResult.year;
    const studios = topResult.studios;
    const genres = topResult.genres;
    const themes = topResult.themes;
    const episodes = topResult.episodes;
    const imageURL = topResult.images.jpg.large_image_url;
    const demographics = topResult.demographic;

    // Title, season, year, episode
    let title = ``;
    if (engTitle) title += `${engTitle}`;
    else if (defaultTitle) title += `${defaultTitle}`;
    if (season || year) title += " (";
    if (season) title += `${toTitleCase(season)}`;
    if (year) title += ` ${year}`
    if (season || year) title += ")";
    if (episodes) title += ` [${episodes} episodes]`

    // Description
    let description = "";
    if (defaultTitle != engTitle) description += `\n*AKA ${defaultTitle}*\n`;
    // Type, airing
    if (showType && status) description += `${showType} • ${status}`;
    // Studio
    if (studios) description += studios.length > 0 ? ` • ${studios[0].name}\n` : "\n";

    description += "\n" + synopsis;


    // Genres
    let genreString = "";
    if (genres.length > 0) {
        let genreStrings: string[] = [];
        for (const genre of genres) {
            genreStrings.push(genre.name);
        }
        genreString += genreStrings.join(", ");
    } else {
        genreString = "No data available.";
    }

    // Ratings
    let ratingString = "";
    if (score) {
        const numStars = Math.round(score / 2)

        ratingString += `${"★".repeat(numStars)}${"☆".repeat(5 - numStars)}`;
        ratingString += `\n${score.toFixed(2)}/10 - ${scoredby} votes`;
        ratingString += `\nRank #${rank} • #${popularity} in popularity`;
    }
    if (ratingString.length == 0) {
        ratingString += "No scores available";
    }

    // Stats
    let statsString = `**Aired:** ${airFromDate.toLocaleDateString('en-us', { month:"short", day:"numeric"})} - ${airToDate.toLocaleDateString('en-us', { month:"short", day:"numeric"})}\n`;
    if (themes.length > 0) {
        statsString += "**Themes: **";
        let themeStrings: string[] = [];
        for (const theme of themes) {
            themeStrings.push(theme.name);
        }
        statsString += themeStrings.join(", ") + "\n";
    } 
    if (demographics != undefined && demographics.length > 0) {
        statsString += "**Demographics: **";
        let demoStrings: string[] = [];
        for (const demo of demographics) {
            demoStrings.push(demo.name);
        }
        statsString += demoStrings.join(", ") + "\n";
    
    }
    



    if (statsString.length > 0) embed.addFields({ name: "Info", value: statsString, inline: true });
    if (genreString.length > 0) embed.addFields({ name: "Genres", value: genreString, inline: true });
    if (ratingString.length > 0) embed.addFields({ name: "Rating", value: ratingString, inline: true });
    embed.setImage(imageURL);
    embed.setDescription(description);
    embed.setTitle(title);
    embed.setURL(malURL);
    embed.setFooter({ text: "Data: MyAnimeList, Jikan", iconURL: "https://cdn.myanimelist.net/img/sp/icon/apple-touch-icon-256.png"})

    // Links
    const row: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();

    // MyAnimeList button
    if (anime.url) {
        const malButton = new ButtonBuilder()
            .setLabel("MyAnimeList")
            .setStyle(ButtonStyle.Link)
            .setURL(anime.url);
        if (config.anime.emojiIds.MyAnimeList) {
            malButton.setEmoji({
                name: "MyAnimeList",
                id: config.anime.emojiIds.MyAnimeList
            });
        }
        row.addComponents(malButton);
    }
    // Trailer button
    if (anime.trailer.url) {
        const trailerButton = new ButtonBuilder()
            .setLabel("Trailer")
            .setStyle(ButtonStyle.Link)
            .setURL(anime.trailer.url);
        if (config.anime.emojiIds.YouTube) {
            trailerButton.setEmoji({
                name: "YouTube",
                id: config.anime.emojiIds.YouTube
            });
        }
        row.addComponents(trailerButton);
    }
    // Incorrect Result button
    if (!isTrace) {
        const incorrectButton = new ButtonBuilder()
            .setCustomId("incorrect")
            .setLabel("Incorrect Result?")
            .setStyle(ButtonStyle.Danger);
        row.addComponents(incorrectButton);
    }
    let response;
    if (message) response = await interaction.edit({content: message, embeds: [embed], components: [row] });
    else response = await interaction.edit({embeds: [embed], components: [row] });
    return response;
}

const sendEmbedAndCollectResponse = async (interaction: Message<boolean>, anime: any, results: any, query: string, author: User): Promise<null> => {
    interaction.edit({ content: `Anime result for "${query}":` });
    const response: Message<boolean> = await createAnimeEmbed(interaction, anime);
    const collectorFilter = (i: { user: { id: string; }; }) => i.user.id === author.id;

    // Collect button responses
    try {
        const buttonResponse = await response.awaitMessageComponent({ filter: collectorFilter, time: 60000 });
        // Only respond if calling user interacted with incorrect button
        if (buttonResponse.customId === 'incorrect' && buttonResponse.user == author) {
            await buttonResponse.deferUpdate();
            let followUpString = "";
            if (results.data.length == 1) {
                followUpString = `I only found 1 result for "${query}". Make sure you spelled the title correctly!`;
            } else {
                let topTenResults = results.data;
                if (results.data.length > 10) {
                    followUpString += `I found ${results.data.length} results for "${query}". Here are the top 10.`;
                    topTenResults = topTenResults.slice(0, 10);
                } else {
                    followUpString += `I found ${results.data.length} results for "${query}".`;
                }
                followUpString += " Please send the number corresponding to the correct movie in chat and I'll fix up the result for you.";

                let counter = 1;
                for (const anime of topTenResults) {
                    followUpString += `\n${counter}. ${anime.title}`;
                    if (anime.title_english) followUpString += ` (${anime.title_english})`;
                    if (anime.season || anime.year) followUpString += " (";
                    if (anime.season) followUpString += `${toTitleCase(anime.season)}`;
                    if (anime.year) followUpString += ` ${anime.year}`
                    if (anime.season || anime.year) followUpString += ")";
                    if (anime.episodes) followUpString += ` [${anime.episodes} episodes]`
                    counter++;
                }
                followUpString += `\nWhen you're done, you can dismiss this message. You can also say "delete" and I'll delete the result.`;
            }
            const followUpMessage: Message<boolean> = await buttonResponse.followUp({ content: followUpString, components: [], ephemeral: true });
            if (results.data.length == 1) return null;

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
                    } else if (Number(collectedMessage.content) <= 0 || Number(collectedMessage.content) > results.data.length) {
                    } else {
                        collectedMessage.delete();
                        const selectedNumber: number = Number(collectedMessage.content);
                        const selectedAnime = results.data[selectedNumber - 1];
                        await sendEmbedAndCollectResponse(interaction, selectedAnime, results, query, author);
                        return;
                    }
                }
            }).catch(async (e) => {
                await buttonResponse.editReply("I ran into an error handling your reply.");
                console.error(e);
            });
        }
    } catch (e) { 
        console.debug(`Error: ${e}`)
    }
    return null;

}

export const anime: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('anime')
        .setDescription('Get information about an anime show or movie')
        .addStringOption((option) =>
            option
                .setName('query')
                .setDescription('The anime to search for')
                .setRequired(true)
        )
        ,
    run: async (interaction) => {
        if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.guild || !interaction.channel) {
            await broadcastCommandStatus(interaction, CommandStatus.CriticallyFailed, {command: anime, reason: "Invalid interaction!"});
            return;
        }
        const query = interaction.options.getString('query');
        if (query == null) {
            await interaction.editReply(`Invalid query!`);
            return;
        } 
        const results = await getAnime(query);
        if (!results) await interaction.editReply(`Jikan API error occurred!`);
        else {
            console.debug(`Found ${results.pagination.items.total} results`);
            const message: Message<boolean> = await interaction.editReply("Finding your anime...");

            await sendEmbedAndCollectResponse(message, results.data[0], results, query, interaction.user);
           
        }

        

        
        
        return;
    },
    properties: {
        Name: "anime",
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