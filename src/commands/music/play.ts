import { CommandInterface } from "../../interfaces/Command.js";
import { ChatInputCommandInteraction, CommandInteraction, SlashCommandBuilder } from "discord.js";
import { BOT } from "../../index.js";
import { GatewayIntentBits } from "discord-api-types/v9";

export const playSong: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a song in your current voice channel')
        .addStringOption((option) =>
            option
                .setName('query')
                .setDescription('The song to play')
                .setRequired(true)
        )
        ,
    run: async (interaction: CommandInteraction) => {
        if( !interaction.isChatInputCommand() ) return;
        const query = interaction.options.getString('query')!;
        const guildQueuer = BOT.getMusicQueuer();

        await guildQueuer.addToQueue({
            query: query,
            interaction: interaction
        });
    },
    properties: {
        Name: "play",
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