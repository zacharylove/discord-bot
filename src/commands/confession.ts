// Confessions
import { CommandInteraction, EmbedBuilder, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { CommandInterface, CommandProperties } from '../interfaces/Command';
import { getGuildDataByGuildID, update } from '../database/guildData';
import { hasPermissions } from '../utils/userUtils';
import { broadcastCommandFailed } from '../utils/commandUtils';
import { validImageURL } from '../utils/utils';


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
    var confessionChannelID = guildData.channels.confessionChannelId;
    // Get confession number
    var confessionNumber = guildData.counters.numConfessions;
    var dataUpdated: boolean = false;
    if ( guildData.counters.numConfessions == null ) {
        guildData.counters.numConfessions, confessionNumber = 1;
        dataUpdated = true;
    }
    if (guildData.channels.confessionChannelId == null) {
        guildData.channels.confessionChannelId,confessionChannelID = "";
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
    
    const footers = [
        "To create a confession of your own, run /confess new in this channel",
        "Confessions are not logged or saved anywhere",
        "❗ If this confession is ToS-breaking or overtly hateful, just delete it",
    ];
    
    let embedToSend: EmbedBuilder = new EmbedBuilder();
    let message: string = "";
    embedToSend
        .setTitle('Anonymous Confession #' + confessionNumber)
        .setDescription(`"${confession}"`)
        .setTimestamp()
        .setFooter({text: footers[Math.floor(Math.random()*footers.length)]});

    // Attach image if provided
    const imageString = interaction.options.getString('image');
    if ( imageString ) {
        /*if ( !validImageURL( imageString ) ) {
            await interaction.editReply('The image you provided is not a valid URL!');
            return;
        }*/
        embedToSend.setImage(imageString);
    }
    // Ping user if one is provided
    const userToPing = interaction.options.getUser('user');
    if ( userToPing ) {
        message += `<@${userToPing.id}> 👀`;
    }
    // Set color to random
    embedToSend.setColor(Math.floor(Math.random()*16777215));

    await interaction.editReply(`Confession received!`);
    await interaction.channel.send({content: message, embeds: [embedToSend]});
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
                .addStringOption((option) =>
                    option
                        .setName('image')
                        .setDescription('An image to attach to your confession (URLs only)')
                        .setRequired(false)
                )
                .addUserOption((option) =>
                    option
                        .setName('user')
                        .setDescription('The user to confess to (will ping them)')
                        .setRequired(false)
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