import { GatewayIntentBits } from "discord-api-types/v9";
import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { BOT } from "../../../index.js";
import { CommandInterface, Feature } from "../../../interfaces/Command.js";
import { MusicStatus } from "../../../utils/music/player.js";


export const stopSong: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('(Music) Stops the current song, clears the queue, and leaves the channel'),
    run: async (interaction: CommandInteraction) => {
        if( !interaction.isChatInputCommand() ) return;
        const musicQueueManager = BOT.getMusicQueuerManager();
        const player = musicQueueManager.get(interaction.guild!.id);
        if (!player.voiceConnection) {
            await interaction.editReply(`Invalid command- I'm not connected to a voice channel!`);
        }
        if (player.status !== MusicStatus.PLAYING) {
            await interaction.editReply(`Invalid command- I'm not playing anything!`);
        }
        const numCleared = player.stop();
        await interaction.editReply(`Okay! Stopped playback and cleared ${numCleared} songs from the queue.`)
    },
    properties: {
        Name: "stop",
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