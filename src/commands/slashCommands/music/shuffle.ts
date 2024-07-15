import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { CommandInterface, Feature } from "../../../interfaces/Command.js";
import { BOT } from "../../../index.js";
import { GatewayIntentBits } from "discord-api-types/v10";
import { confirmationMessage } from "../../../utils/utils.js";


export const shuffleQueue: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('(Music) Shuffles the queue'),
    run: async (interaction: CommandInteraction) => {
        if( !interaction.isChatInputCommand() ) return;
        const musicQueueManager = BOT.getMusicQueuerManager();
        const player = musicQueueManager.get(interaction.guild!.id);
        const numSongs: number = player.getQueue().length;
        if( numSongs < 2 ) {
            await interaction.editReply(`There are not enough songs in the queue to shuffle!`);
            return;
        }
        await player.shuffle();
        await interaction.editReply(`${confirmationMessage()} shuffled ${numSongs} songs in the queue! Up next is **${player.getQueue()[1].title}**`);
    },
    properties: {
        Name: "Shuffle Music Queue",
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