import { GatewayIntentBits } from "discord-api-types/v9";
import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { BOT } from "../../index.js";
import { CommandInterface, Feature } from "../../interfaces/Command.js";
import { MusicStatus } from "../../utils/music/player.js";

export const pause: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('(Music) Pauses the current song'),
    run: async (interaction: CommandInteraction) => {
        if( !interaction.isChatInputCommand() ) return;
        const musicQueueManager = BOT.getMusicQueuerManager();
        const player = musicQueueManager.get(interaction.guild!.id);
        if (player === undefined) {
            await interaction.editReply(`No song is currently playing!`);
            return;
        }
        if (player.getStatus() === MusicStatus.PAUSED) {
            await interaction.editReply(`The song is already paused!`);
            return;
        }
        await player.pause();
        await interaction.editReply(`Paused! Use /resume to resume playback.`);
    },
    properties: {
        Name: "pause",
        Aliases: ["p"],
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

export const resume: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('(Music) Resumes playing the current song'),
    run: async (interaction: CommandInteraction) => {
        if( !interaction.isChatInputCommand() ) return;
        const musicQueueManager = BOT.getMusicQueuerManager();
        const player = musicQueueManager.get(interaction.guild!.id);
        if (player === undefined) {
            await interaction.editReply(`No song is currently playing!`);
            return;
        }
        if (player.getStatus() === MusicStatus.PLAYING) {
            await interaction.editReply(`The song is already playing!`);
            return;
        }
        await player.resume();
        await interaction.editReply(`Resumed! Use /pause or /stop to stop playback.`);
    },
    properties: {
        Name: "resume",
        Aliases: ["r"],
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