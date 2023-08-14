import { Channel, SlashCommandBuilder } from "discord.js";
import { CommandInterface } from "../interfaces/Command";
import { setStarboardChannel as setChannel, setStarboardEmojis as setEmojis, setStarboardThreshold as setThreshold } from "../database/guildData";

const setStarboardChannel = async (interaction: any): Promise<string> => {
    const channel: Channel = interaction.options.getChannel('channel');
    var toReturn: string = "";
    if (!channel.isTextBased()) {
        toReturn = 'The starboard channel must be a valid text channel';
    } else {
        toReturn += await setChannel(interaction.guildId, channel.id);
    }

    return toReturn;
}

const setStarboardThreshold = async (interaction: any): Promise<string> => {
    const count: number = interaction.options.getInteger('count');
    var toReturn: string = "";
    if (count < 1) {
        toReturn = 'The starboard threshold must be greater than 0';
    } else {
        toReturn = await setThreshold(interaction.guildId, count);
    }
    return toReturn;
}

const setStarboardEmojis = async (interaction: any): Promise<string> => {
    if (!interaction.options.getString('emoji') && !interaction.options.getString('success')) {
        return 'You must provide at least one emoji';
    } else {
        return setEmojis(interaction.guildId, interaction.options.getString('emoji'), interaction.options.getString('success'));
    }
}





export const starboard: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('starboard')
        .setDescription('Manage starboard settings for the server')
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Set the starboard channel')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel to set as the starboard channel')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('threshold')   
                .setDescription('Set the starboard threshold')
                .addIntegerOption(option =>
                    option
                        .setName('count')
                        .setDescription('The number of stars required to be on the starboard')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('emoji')
                .setDescription('Set the starboard emoji(s)')
                .addStringOption(option =>
                    option
                        .setName('emoji')
                        .setDescription('The emoji to use for the starboard')
                )
                .addStringOption(option =>
                    option
                        .setName('success')
                        .setDescription('The emoji to react with when a message is successfully added to the starboard')
                )
        )
    ,
    run: async (interaction) => {
        // Disable context menu
        if (!interaction.isChatInputCommand()) {
            await interaction.editReply('This command cannot be used in a context menu');
            return;
        }
        // Disable DMS
        if (!interaction.guildId || !interaction.guild || !interaction.channel) {
            await interaction.editReply('This command cannot be used in DMs');
            return;
        }
        switch (interaction.options.getSubcommand()) {
            case 'channel':
                await interaction.editReply(await setStarboardChannel(interaction));
                break;
            case 'threshold':
                await interaction.editReply(await setStarboardThreshold(interaction));
                break;
            case 'emoji':
                await interaction.editReply(await setStarboardEmojis(interaction));
                break;
        }

        
    },
    properties: {
        Name: 'Starboard',
        Scope: 'global',
        GuildOnly: true,
        DefaultEnabled: true,
        Enabled: true,
        Permissions: [],
    }
}