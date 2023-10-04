import { GatewayIntentBits } from "discord-api-types/v9";
import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { BOT } from "../../index.js";
import { CommandInterface, Feature } from "../../interfaces/Command.js";


export const queue: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('(Music) Displays the current queue')
        .addIntegerOption((option) =>
            option
                .setName('page')
                .setDescription('The page of the queue to display')
                .setRequired(false)
        ),
    run: async (interaction: CommandInteraction) => {
        if( !interaction.isChatInputCommand() ) return;
        const page: number = interaction.options.getInteger('page') ?? 1;
        const musicQueuer = BOT.getMusicQueuer();
        const embed = await musicQueuer.createQueueEmbed(interaction.guild!.id, page);

        await interaction.editReply({embeds: [embed]});
    },
    properties: {
        Name: "queue",
        Aliases: ["q"],
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