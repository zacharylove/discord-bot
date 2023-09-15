import axios, { AxiosResponse } from "axios";
import { CommandInterface } from "../interfaces/Command";
import { ButtonStyle, CommandInteraction, Interaction, Message, SlashCommandBuilder, User } from "discord.js";
import { broadcastCommandFailed } from "../utils/commandUtils";
import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, MessageActionRowComponentBuilder } from "@discordjs/builders";
import { animeStatus, animeType, getAnime } from "../api/jikanAPI";

import { toTitleCase } from "../utils/utils";


const createEmbed = async (interaction: Message<boolean>, anime: any): Promise<Message<boolean>> => {
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
    let title = `${engTitle} (${toTitleCase(season)} ${year}) [${episodes} episodes]`;

    // Description
    let description = "";
    // Type, airing
    description += `${showType} • ${status}`;
    // Studio
    description += studios.length > 0 ? ` • ${studios[0].name}\n` : "\n";

    description += "\n" + synopsis;

    if (defaultTitle != engTitle) description += `\n*AKA ${defaultTitle}*`;

    

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

    const response = await interaction.edit({ embeds: [embed] });
    return response;
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
            await broadcastCommandFailed(interaction, "Interaction is NOT poggers!");
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

            await createEmbed(message, results.data[0]);
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