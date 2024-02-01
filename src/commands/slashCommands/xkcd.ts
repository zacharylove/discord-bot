import { CommandInteraction } from "discord.js";
import { CommandInterface } from "../../interfaces/Command";
import { EmbedBuilder, SlashCommandBuilder } from "@discordjs/builders";
import { RequestInterface } from "../../interfaces/RequestInterface";
import axios, { AxiosResponse } from "axios";

// The xkcd API is so simple it'd be a waste to give it its own file lol
const xkcdAPI: RequestInterface = {
    makeRequest: async (requestURL: string): Promise<AxiosResponse<any,any> | null> => {        
        let res = await axios.get(requestURL);
        if (res.status !== 200) {
            throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        return res;
    },
    formRequestURL(requestInfo: number) {
        let requestURL = "https://xkcd.com/";
        if (requestInfo != -1) {
            requestURL += `${requestInfo}/`;
        }
        requestURL += "info.0.json";
        return requestURL;
    },
}

const getComic = async (comicNumber: number): Promise<any> => {
    try {
        const res = await xkcdAPI.makeRequest(xkcdAPI.formRequestURL(comicNumber));
        if (!res) return null;
        return res.data;
    } catch (e) {
        console.error(`xkcd API Error: ${e}`);
        return null;
    }
}


export const xkcd: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('xkcd')
        .setDescription('Show an xkcd comic')
        .addIntegerOption((option) =>
            option
                .setName('number')
                .setDescription('Comic number to show')
                .setRequired(false)
        )
    ,
    run: async (interaction: CommandInteraction) => {
        if (!interaction.isChatInputCommand()) return
        let comicNumber = interaction.options.getInteger('number');
        if (comicNumber == null) comicNumber = -1;
        if (comicNumber <= 0) {
            await interaction.editReply(`Really? ${comicNumber}?`);
            return;
        }

        const res = await getComic(comicNumber);
        if (res == null) {
            if (comicNumber != -1) await interaction.editReply(`Comic #${comicNumber} doesn't exist (yet)!`);
            else await interaction.editReply("Error occurred while fetching the latest comic :/");
            return;
        }
        const embed = new EmbedBuilder()
            .setTitle(`"${res.title}"`)
            .setDescription(`*${res.alt}*`)
            .setImage(res.img)
            .setFooter({text: `xkcd #${res.num} (${res.day}-${res.month}-${res.year})`})
            ;

        await interaction.editReply({embeds: [embed]})

    },
    properties: {
        Name: "xkcd",
        Aliases: [],
        Scope: 'global',
        GuildOnly: true,
        Enabled: true,
        DefaultEnabled: true,
        Intents: []
    }
}