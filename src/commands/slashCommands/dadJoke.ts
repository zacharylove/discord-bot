import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { CommandInterface } from "../../interfaces/Command.js";
import { fetchRandomDadJoke, searchDadJoke } from "../../api/dadJokeAPI.js";


export const dadJoke: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('dadjoke')
        .setDescription('Show a dad joke')
        .addStringOption((option) => 
            option
                .setName('query')
                .setDescription('Search for a dad joke')
                .setRequired(false)
        )
    ,
    run: async (interaction: CommandInteraction) => {
        if (!interaction.isChatInputCommand()) return
        let query = interaction.options.getString('query');

        let joke: string = "";
        if (query == null) {
            joke = await fetchRandomDadJoke();
            if (joke == "") {
                joke = "inco was arrested for writing unreadable code. He refused to comment. (An error occurred)";
            }
        } else {
            let jokeList: string[] = await searchDadJoke(query);
            if (jokeList.length == 0) {
                joke = `No jokes found for ${query}`;
            } else {
                joke = `Found ${jokeList.length} result(s) for ${query}:`;
                for (const j of jokeList) {
                    joke += `\n> ${j.replaceAll("\r\n\r\n", "\n> ")}\n`
                }
            }
        }
        await interaction.editReply(joke);
    },
    properties: {
        Name: "Dad Joke",
        Aliases: [],
        Scope: 'global',
        GuildOnly: false,
        Enabled: true,
        DefaultEnabled: true,
        Intents: []
    }
}