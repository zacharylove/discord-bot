import { CommandInterface } from "../../interfaces/Command.js";
// @ts-ignore
import { default as config } from "../../config/config.json" assert { type: "json" };
import { ButtonStyle, EmbedBuilder, Message, SlashCommandBuilder, User } from "discord.js";
import { CommandStatus, broadcastCommandStatus } from "../../utils/commandUtils.js";
import { BookResponse, findHardcoverBook, searchBooksByTitle } from "../../api/googleBooksAPI.js";
import { toTitleCase } from "../../utils/utils.js";

const createEmbed = async (interaction: Message<boolean>, book: BookResponse): Promise<Message<boolean>> => {
    const embed =  new EmbedBuilder();

    let hardcoverInfo;
    try {
        hardcoverInfo = await findHardcoverBook(book.title);
    } catch (e) {
        console.error(e);
    }
    let rating, ratingsCount, genreTags, moodTags, otherTags, hardcoverDesc;
    if (hardcoverInfo && hardcoverInfo.data.data.books.length > 0) {
        for (const b of hardcoverInfo.data.data.books) {
            if (b.rating) rating = b.rating;
            if (b.ratings_count) ratingsCount = b.ratings_count;
            if (b.cached_tags) {
                if (b.cached_tags.Genre) genreTags = b.cached_tags.Genre;
                if (b.cached_tags.Mood) moodTags = b.cached_tags.Mood;
                if (b.cached_tags.Tag) otherTags = b.cached_tags.Tag;
            }
            if (b.description) hardcoverDesc = b.description;
            if (rating || ratingsCount) break;
        }
    }

    let title = `${book.title}${book.authors && book.authors.length > 0 ? ` - ${book.authors[0]}` : ""}`;
    embed.setTitle(title);

    if (book.thumbnailURL != "") embed.setThumbnail(book.thumbnailURL)

    let description = "";
    //if (book.tagline != "" && book.tagline != book.description) description = book.tagline + "\n--\n"
    description += hardcoverDesc ? hardcoverDesc : book.description;
    if (book.publisher != "") description += `\n\n \\- *${book.publisher}*`;
    embed.setDescription(description);
    
    let infoString = "";
    if (book.authors.length > 1) infoString += `**Authors:** ${book.authors.join(", ")}\n`;
    if (book.publishDate != "") infoString += `**Published:** ${book.publishDate}\n`;
    if (book.language != "") infoString += `**Language:** ${book.language}\n`;
    if (book.pageCount != -1) infoString += `**Pages:** ${book.pageCount}\n`
    
    if (infoString.length > 0) embed.addFields({
        name: "Book Info",
        value: infoString,
        inline: true
    });

    // Rating
    let ratingString = "";
    if (rating) {
        const numStars = Math.round(rating);
        ratingString += `${"★".repeat(numStars)}${"☆".repeat(5 - numStars)}`;
        ratingString += `\n${rating.toFixed(2)}/10 - ${ratingsCount} votes`;
    }
    if (ratingString.length == 0) {
        ratingString += "No scores available";
    }
    embed.addFields({ name: "Rating", value: ratingString, inline: true });

    // Genres
    let genreString = "";
    let genreList = [];
    // Google Books fallback
    if (!genreTags && book.categories.length > 0) genreList = book.categories;
    else if (genreTags) {
        for (const genre of genreTags) {
            genreList.push(toTitleCase(genre.tag));
        }
    }
    genreString = genreList.join(", ");
    if (genreString.length > 0) embed.addFields({
        name: "Genres",
        value: genreString,
        inline: true
    });

    // Moods
    let moodString = "";
    let moodList = [];
    if (genreTags) {
        for (const mood of moodTags) {
            moodList.push(toTitleCase(mood.tag));
        }
    }
    moodString = moodList.join(", ");
    if (moodString.length > 0) embed.addFields({
        name: "Moods",
        value: moodString,
        inline: true
    });

    // Tags
    let tagString = "";
    let tagList = [];
    if (otherTags) {
        for (const tag of otherTags) {
            tagList.push(toTitleCase(tag.tag));
        }
    }
    tagString = tagList.slice(0, tagList.length / 2).join(", ");
    if (tagString.length > 0) embed.addFields({
        name: "Tags",
        value: tagString,
        inline: true
    });

    const response = await interaction.edit({ embeds: [embed]});
    return response;
}


export const book: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('book')
        .setDescription('Get information about a book')
        .addStringOption((option) =>
            option
                .setName('query')
                .setDescription('The book title to search for')
                .setRequired(true)
        ),
    run: async (interaction) => {
        if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.guild || !interaction.channel) {
            await broadcastCommandStatus(interaction, CommandStatus.CriticallyFailed, {command: book, reason: "Invalid interaction!"});
            return;
        }

        const query = interaction.options.getString('query');
        if (query == null) {
            await interaction.editReply(`Invalid query!`);
            return;
        } 
        const results: BookResponse[] = await searchBooksByTitle(query);
        if (results.length == 0) {
            await interaction.editReply('No results found!');
            return;
        } else {
            console.debug(`Found ${results.length} results`)
            const message: Message<boolean> = await interaction.editReply("Finding your book...");

            await createEmbed(message, results[0]);
            return;
        }
    },
    properties: {
        Name: "book",
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