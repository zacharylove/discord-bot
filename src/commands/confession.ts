// Confessions
import { CommandInteraction, EmbedBuilder, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { CommandInterface, CommandProperties } from '../interfaces/Command';
import { getGuildDataByGuildID, update } from '../database/guildData';
import { hasPermissions } from '../utils/userUtils';
import { broadcastCommandFailed } from '../utils/commandUtils';


const createNewConfession = async (interaction: CommandInteraction) => {
    if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.guild || !interaction.channel) {
        await broadcastCommandFailed(interaction, "Interaction is NOT poggers!");
        return;
    }

    if ( interaction.options.getString('confession') == null ) {
        await interaction.editReply('You must provide a confession!');
        return;
    }
    const guildData = await getGuildDataByGuildID(interaction.guildId);

    // Check if the channel is the confession channel
    const confessionChannelID = guildData.channels.confessionChannelId;
    // Get confession number
    var confessionNumber = guildData.counters.numConfessions;
    var dataUpdated: boolean = false;
    if ( guildData.counters.numConfessions == null ) {
        guildData.counters.numConfessions = 1;
        dataUpdated = true;
    }
    if (guildData.channels.confessionChannelId == null) {
        guildData.channels.confessionChannelId = "";
        dataUpdated = true;
    }
    if (dataUpdated) update(guildData);
    if ( confessionChannelID == "" ) {
        await interaction.editReply('The confession channel has not been set up for this server yet! Run /confess channel to set it up.');
        return;
    } else if ( interaction.channelId != confessionChannelID ) {
        await interaction.editReply('This command can only be used in the confession channel, which is <#' + confessionChannelID + '>');
        return;
    }

    
    // Get confession content
    const confession = interaction.options.getString('confession');
    

    
    let embedToSend: EmbedBuilder = new EmbedBuilder();
    embedToSend
        .setTitle('Anonymous Confession #' + confessionNumber)
        .setDescription(`"${confession}"`)
        .setTimestamp()
        .setFooter({text: "❗ If this confession is ToS-breaking or overtly hateful, you can eat my shorts"});

    await interaction.editReply(`Confession received!`);
    await interaction.channel.send({embeds: [embedToSend]});
    guildData.counters.numConfessions++;
    await update(guildData);
}

const setConfessionChannel = async (interaction: CommandInteraction) => {
    if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.guild || !interaction.channel || !interaction.member) {
        await broadcastCommandFailed(interaction, "Interaction is NOT poggers!");
        return;
    }
    // Must be a mod
    if ( !hasPermissions(PermissionsBitField.Flags.ManageGuild, interaction.guild, interaction.user) ) {
        await interaction.editReply('You must be a mod to use this command!');
        return;
    }

    
    const guildData = await getGuildDataByGuildID(interaction.guildId);
    const channel = interaction.options.getChannel('channel');
    if ( channel == null ) { 
        await interaction.editReply('You must provide a channel!');
        return;
    }
    
    guildData.channels.confessionChannelId = channel.id

    await interaction.editReply(`Confession channel set to ${channel.name}!`);
    await update(guildData);
}

export const confess: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('confess')
        .setDescription('Confession commands')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('new')
                .setDescription('Confess something in the current channel anonymously!')
                .addStringOption((option) =>
                    option
                        .setName('confession')
                        .setDescription('Your confession')
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('channel')
                .setDescription('Set the confession channel')
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('The channel to set as the confession channel')
                        .setRequired(true)
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
        switch ( interaction.options.getSubcommand() ) {
            case 'new':
                await createNewConfession(interaction);
                break;
            case 'channel':
                await setConfessionChannel(interaction);
                break;
        }

        return;
    },
    properties: {
        Name: 'Confess',
        Scope: 'global',
        GuildOnly: true,
        DefaultEnabled: true,
        Enabled: true,
        Permissions: [],
        Ephemeral: true
    }
}