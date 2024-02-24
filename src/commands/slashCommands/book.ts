import { CommandInterface } from "../../interfaces/Command.js";
// @ts-ignore
import { default as config } from "../../config/config.json" assert { type: "json" };
import { ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, Message, SlashCommandBuilder, User } from "discord.js";
import { CommandStatus, broadcastCommandStatus } from "../../utils/commandUtils.js";
import { BookResponse, findHardcoverBook, searchBooksByTitle } from "../../api/googleBooksAPI.js";
import { sleep, toTitleCase, truncateString } from "../../utils/utils.js";
import { ActionRowBuilder, MessageActionRowComponentBuilder } from "@discordjs/builders";

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

    embed.setFooter({ text: "Data: Hardcover, Google Books", iconURL: "https://storage.googleapis.com/hardcover/images/logos/hardcover-logo.jpeg"});
    const response = await interaction.edit({ content: `Here's what I found:`, embeds: [embed], components: []});
    return response;
}

const selectResult = async (interaction: Message<boolean>, books: BookResponse[][], results: number, query: string, page: number ) => {
    let resultMessage = `Found ${results} results for "${query}". Respond with the number corresponding to your desired book, or say "cancel" to cancel search.\n`;
    let counter = 1 + page*3;
    for (const book of books[page]) {
        // Truncate description to first sentence
        resultMessage += `### ${counter}. ${book.title}`;
        if (book.authors && book.authors.length > 0) resultMessage += ` - ${book.authors[0]}`
        resultMessage += `${book.publisher || book.publishDate ? `\n*${book.publisher ? book.publisher : ""}${book.publisher && book.publishDate ? " • " : ""}${book.publishDate ? "Published " + book.publishDate : ""}*` : ""}`
        if (book.description != "") resultMessage += `\n> ${truncateString(book.description, 200)}`
        resultMessage += "\n";
        counter++;
        
    }

    // Create next/prev button
    if (books.length > 1) {
        const row: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();
        const pageNumButton = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setCustomId('pageNum')
            .setLabel(`Page ${page+1}/${books.length}`)
            .setDisabled(true);
        row.addComponents(pageNumButton);
        // Only create previous button if we are not on the first page
        if (page != 0) {
            const prevButton = new ButtonBuilder()
                .setStyle(ButtonStyle.Primary)
                .setCustomId('prev');
            if (config.book.emojiIds.prev) {
                prevButton.setEmoji({
                    name: "backward",
                    id: config.book.emojiIds.prev
                })
            } else { prevButton.setLabel("Prev"); }
            row.addComponents(prevButton);
        }
        if (page != books.length - 1) {
            const nextButton = new ButtonBuilder()
                .setStyle(ButtonStyle.Primary)
                .setCustomId('next');
            if (config.book.emojiIds.next) {
                nextButton.setEmoji({
                    name: "next",
                    id: config.book.emojiIds.next
                })
            } else { nextButton.setLabel("Next"); }
            row.addComponents(nextButton);
        }
        return await interaction.edit({content: resultMessage, components: [row]});
    }

    return await interaction.edit({content: resultMessage, components: []});
}

const sendResultsAndCollectResponses = async (interaction: Message<boolean>,  books: BookResponse[][], results: number, query: string, author: User, currentPage: number) => {
    const response: Message<boolean> = await selectResult(interaction, books, results, query, currentPage);
    // Only collect button responses if there are more than 1 pages
    if (books.length > 1) {
        const buttonCollectorFilter = (i: { user: { id: string; }; }) => i.user.id === author.id;
        const messageCollectorFilter = (m: Message<boolean>) => m.author.id === author.id;
        // Collect button responses
        try {
            const buttonCollector = response.createMessageComponentCollector({ componentType: ComponentType.Button, filter: buttonCollectorFilter, time: 60000});

            buttonCollector.on('collect', async buttonResponse => {
                if (buttonResponse.user == author) {
                    switch (buttonResponse.customId) {
                        case 'next': 
                            currentPage++;
                            sleep(200).then( async () => { await sendResultsAndCollectResponses(response, books, results, query, author, currentPage); } );
                            break;
                        case 'prev':
                            currentPage--;
                            sleep(200).then( async () => { await sendResultsAndCollectResponses(response, books, results, query, author, currentPage); } );
                            break;
                    }
                }
            });  

            const selectionCollector = response.channel.createMessageCollector({ filter: messageCollectorFilter, time: 60000});

            selectionCollector.on('collect', async messageResponse => {
                if (messageResponse.author == author) {
                    // 3 per page
                    const collectedMessage = messageResponse.content;
                    if (collectedMessage == "cancel") {
                        try { await messageResponse.delete(); } catch (e) {}
                        await response.delete();
                        return;
                    }
                    if(!Number.isNaN(Number(collectedMessage)) && Number(collectedMessage) > 0) {
                        const receivedNumber = Number(collectedMessage);
                        if (receivedNumber > 3*currentPage && receivedNumber <= 3*(currentPage+1)) {
                            let selection = (receivedNumber - 3*currentPage) - 1;
                            try { await messageResponse.delete(); } catch (e) {}
                            await createEmbed(response, books[currentPage][selection]);
                        }
                    }
                }
            })
        } catch (e) {
            console.debug(`Error: ${e}`);
        }
    }

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
        let numResults = results.length;
        // Split into "pages" of up to 3 books
        const splitResults: BookResponse[][] = [];
        let temp = [];
        for (let i = 0; i < results.length; i++) {
            if (!results[i].title) {
                numResults--;
                continue;
            }
            temp.push(results[i]);
            if ((i+1) % 3 == 0) {
                splitResults.push(temp);
                temp = [];
            }
        }
        if (results.length == 0) {
            await interaction.editReply('No results found!');
            return;
        } else {
            console.debug(`Found ${results.length} results`)
            const message: Message<boolean> = await interaction.editReply("Finding your book...");

            await sendResultsAndCollectResponses(message, splitResults, numResults, query, interaction.user, 0);

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