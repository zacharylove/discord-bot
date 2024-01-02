import { ApplicationCommandType, CommandInteraction, ContextMenuCommandBuilder } from "discord.js";
import { CommandInterface } from "../../interfaces/Command.js";
import { parseImageURL } from "../../utils/imageUtils.js";
import { getAnimeSource } from "../../api/traceAPI.js";
import { EmbedBuilder } from "@discordjs/builders";
import { secondsToTimestamp } from "../../utils/utils.js";
import { getAnime } from "../../api/jikanAPI.js";
import { createAnimeEmbed } from "../slashCommands/anime.js";


export const animeSource: CommandInterface = {
    data: new ContextMenuCommandBuilder()
        .setName('Find Anime Source')
        .setType(ApplicationCommandType.Message)
    ,
    run:  async (interaction: CommandInteraction) => {
        if (!interaction.isMessageContextMenuCommand()) return;
        await interaction.deferReply();
        let imageURL: string = await parseImageURL(interaction);
        const originalMessageURL = interaction.targetMessage.url;
        if (imageURL == "") {
            await interaction.editReply(`Sorry, I couldn't find an image in [this message](<${originalMessageURL}>).`);
            return;
        }
        const results = await getAnimeSource(imageURL);
        if (typeof results === 'string') {
            let errorMessage = `Sorry, an API error occurred while looking up [this image](<${originalMessageURL}>): `;
            errorMessage += "\n```" + results + "```";
            await interaction.editReply(errorMessage);
            return;
        }
        
        if (results == null) {
            await interaction.editReply("An error occurred");
            return;
        }
        const message = await interaction.editReply("Taking a look...");
        const topResult = results.result[0];

        // From/to timestamps
        const episode = topResult.episode;
        const similarity = Math.round(topResult.similarity * 10000) / 100;
        let fromTime = await secondsToTimestamp(topResult.from, true);
        let toTime = await secondsToTimestamp(topResult.to, true);
        let title = topResult.anilist.title.english;
        if (!title || title == "") title = topResult.anilist.title.romaji;

        const responseMessage = `I'm ${similarity}% sure [this image](<${originalMessageURL}>) is from \`${fromTime}\` to \`${toTime}\` of episode ${episode} of **${title}**`;
    
        // Use the /anime command to retrieve info
        const animeResults = await getAnime(title);
        const response = await createAnimeEmbed(message, animeResults.data[0], responseMessage, true);
    },
    properties: {
        Name: 'Anime Source',
        Scope: 'global',
        GuildOnly: false,
        Enabled: true,
        DefaultEnabled: true,
        Intents: [],
        Defer: false,
    }
}