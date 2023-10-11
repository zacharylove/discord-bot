import { GatewayIntentBits } from "discord-api-types/v9";
import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { BOT } from "../../../index.js";
import { CommandInterface, Feature } from "../../../interfaces/Command.js";

export const nowPlaying: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('(Music) Displays the currently playing song'),
    run: async (interaction: CommandInteraction) => {
        if( !interaction.isChatInputCommand() ) return;
        const musicQueuer = BOT.getMusicQueuer();

        await interaction.editReply({embeds: [await musicQueuer.createNowPlayingEmbed(interaction.guild!.id)]});

    },
    properties: {
        Name: "nowplaying",
        Aliases: ["np"],
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