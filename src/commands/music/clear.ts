import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { CommandInterface } from "../../interfaces/Command.js";
import { BOT } from "../../index.js";
import { GatewayIntentBits } from "discord-api-types/v9";

export const clearQueue: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clears the queue')
        .addBooleanOption((option) =>
            option.setName('all')
                .setDescription('Also remove the currently playing song?')
                .setRequired(false)
        )
    ,
    run: async (interaction: CommandInteraction) => {
        if( !interaction.isChatInputCommand() ) return;
        const clearCurrent: boolean = interaction.options.getBoolean('all') ?? false;
        const musicQueueManager = BOT.getMusicQueuerManager();
        const player = musicQueueManager.get(interaction.guild!.id);
        const numSongs: number = player.getQueue().length;
        if( clearCurrent && numSongs < 1 || !clearCurrent && numSongs < 2 ) {
            await interaction.editReply(`There are no songs in the queue to clear!`);
            return;
        }
        player.clear(clearCurrent);
        await interaction.editReply(`Okay, cleared ${clearCurrent ? numSongs : numSongs - 1} songs in the queue!${clearCurrent ? ' Stopping playback.' : ''}`);
    },
    properties: {
        Name: "clear",
        Aliases: [],
        Scope: "global",
        GuildOnly: true,
        Enabled: true,
        DefaultEnabled: true,
        CanBeDisabled: true,
        Intents: [GatewayIntentBits.GuildVoiceStates],
        Permissions: [],
        Ephemeral: false,
    }
}