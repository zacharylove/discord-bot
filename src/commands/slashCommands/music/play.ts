import { CommandInterface, Feature } from "../../../interfaces/Command.js";
import { ChatInputCommandInteraction, CommandInteraction, SlashCommandBuilder } from "discord.js";
import { BOT } from "../../../index.js";
import { GatewayIntentBits } from "discord-api-types/v9";

export const playSong: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('(Music) Plays a song in your current voice channel')
        .addStringOption((option) =>
            option
                .setName('query')
                .setDescription('The song to play')
                .setRequired(true)
        )
        .addBooleanOption((option) =>
            option
                .setName('next')
                .setDescription('Whether to add to the front of the queue')
        )
        .addBooleanOption((option) =>
            option
                .setName('shuffle')
                .setDescription('Whether to shuffle the queue')
        )
        ,
    run: async (interaction: CommandInteraction) => {
        if( !interaction.isChatInputCommand() ) return;
        const query = interaction.options.getString('query')!;
        const next = interaction.options.getBoolean('next') ?? false;
        const shuffle = interaction.options.getBoolean('shuffle') ?? false;
        const guildQueuer = BOT.getMusicQueuer();

        await guildQueuer.addToQueue({
            query: query,
            interaction: interaction
        }, shuffle, next);
    },
    properties: {
        Name: "play",
        Aliases: [],
        Scope: "global",
        GuildOnly: true,
        Enabled: false,
        DefaultEnabled: true,
        CanBeDisabled: true,
        Intents: [GatewayIntentBits.GuildVoiceStates],
        Permissions: [],
        Ephemeral: false,
        Feature: Feature.Music
    }
}