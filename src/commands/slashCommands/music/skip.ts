import { GatewayIntentBits } from "discord-api-types/v9";
import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { BOT } from "../../../index.js";
import { CommandInterface, Feature } from "../../../interfaces/Command.js";


export const skipSong: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('(Music) Skips to the next song in the queue')
        .addIntegerOption((option) =>
            option
                .setName('number')
                .setDescription('number of songs to skip [default: 1]')
                .setRequired(false)
        )
        ,
    run: async (interaction: CommandInteraction) => {
        if( !interaction.isChatInputCommand() ) return;
        const numToSkip = interaction.options.getInteger('number') ?? 1;
        if (numToSkip < 1) await interaction.editReply(`Invalid command- you can't skip negative songs, dummy!`);
        const musicQueueManager = BOT.getMusicQueuerManager();
        const player = musicQueueManager.get(interaction.guild!.id);
        
        const success: boolean = await player.forward(numToSkip);
        if (!success) interaction.editReply(`Command failed! You can't skip more songs than there are in the queue!`);
        else interaction.editReply(`Okay, skipped ${numToSkip} songs!`);
    },
    properties: {
        Name: "skip",
        Aliases: [],
        Scope: "global",
        GuildOnly: true,
        Enabled: true,
        DefaultEnabled: true,
        CanBeDisabled: true,
        Intents: [GatewayIntentBits.GuildVoiceStates],
        Permissions: [],
        Ephemeral: false,
        Feature: Feature.Music
    }
}