// View a list of guild-specific settings and enable/disable commands and features.
import { CommandInterface } from "../../interfaces/Command.js";
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, MessageActionRowComponentBuilder } from "@discordjs/builders";
import { areWordleFeaturesEnabled, disableStarboardFeature, disableWordleFeatures, enableStarboardFeature, enableWordleFeatures, getEnabledDisabledCommands, getGuildDataByGuildID, isStarboardEnabled, isTwitterEmbedFixEnabled, toggleTwitterEmbedFix } from "../../database/guildData.js";
import { GuildDataInterface } from "../../database/models/guildModel.js";
import { commandNotImplemented, getCommandListAsString } from "../../utils/commandUtils.js";
import { ButtonBuilder, ButtonStyle, CommandInteraction, PermissionsBitField } from "discord.js";
import { hasPermissions } from "../../utils/userUtils.js";
// @ts-ignore
import { default as config } from "../../config/config.json" assert { type: "json" };


// TODO: clean up enabled/disabled features.... lots of repeated code rn


// Required permission to enable/disable
const requiredPermissions = PermissionsBitField.Flags.ManageGuild;
let enabledDisabledCommands: Map<string, boolean>;
let guildData: GuildDataInterface;

// Settings command
// If no arguments are provided, display a list of all guild-specific settings

const displaySettingsOverview = async (interaction: CommandInteraction, embed: EmbedBuilder): Promise<EmbedBuilder> => {
    // shut up typescript
    if ( !interaction.guild ) { return embed; }

    let description: string = "";
    description += "Using the settings command and subcommands, you can edit server-specific settings and turn features and commands on/off.\n";
    description += "Features are behaviors that run in the background, like scanning for wordle results, and sometimes require additional permissions to be given to the bot.\n";
    description += "Some commands/features are enabled by default, and some are disabled by default.\n";
    description += "In order to enable a command or feature, you must have the `Manage Server` permission.\n";
    

    embed.addFields({name: 'Enable/disable a command', value: "`/settings command <enable/disable> <command name>`"});
    embed.addFields({name: 'Enable/disable a feature', value: "`/settings feature <enable/disable> <feature name>`"});
    embed.addFields({name: 'List all commands', value: "`/settings command list`"});
    embed.addFields({name: 'List all features', value: "`/settings feature list`"});
    embed.addFields({name: 'List all commands and features', value: "`/settings list`"});

    return embed;
}


/**
 * Sends a list of available/enabled/disabled commands and feature settings for the guild
 * @param interaction 
 */

const commandFeatureList = async (interaction: CommandInteraction) => {
    // shut up typescript
    if ( !interaction.guild || !interaction.guildId ) { return; }

    const embed = new EmbedBuilder();

    

    let description: string = ""
    description += "Here are all of the commands and features available.\n"
    description += "To enable/disable, hit the 'toggle' button. To configure features, hit 'configure'.\n"

    embed.setTitle("Command List for " + interaction.guild.name);
    embed.setDescription(description);

    // Now remember:
    // - Globally disabled commands are disabled everywhere
    // - Globally enabled commands are enabled UNLESS they are specifically disabled
    // 

    const wordleCommands: string[] = [];
    const starboardCommands: string[] = [];
    const musicCommands: string[] = [];
    const confessionCommands: string[] = [];
    const twitterFixCommands: string[] = [];


    let enabledCommandsString: string = '';
    let disabledCommandsString: string = '';
    let contentScanningString: string = '';

    for (const [command, enabled] of enabledDisabledCommands.entries()) {
        let commandName: string = command.toLowerCase().replace(/ /g, '');
        if (config.wordle.commands.includes(commandName)) wordleCommands.push(command);
        else if (config.starboard.commands.includes(commandName)) starboardCommands.push(command);
        else if (config.music.commands.includes(commandName)) musicCommands.push(command);
        else if (config.confession.commands.includes(commandName)) confessionCommands.push(command);
        
        else if (enabled) enabledCommandsString += `- ${command}\n`;
        else disabledCommandsString += `- ${command}\n`;
    }
    if (enabledCommandsString == '') enabledCommandsString = "None";
    if (disabledCommandsString == '') disabledCommandsString = "None";

    embed.addFields({name: 'Enabled Commands', value: enabledCommandsString, inline: true});
    embed.addFields({name: 'Disabled Commands', value: disabledCommandsString, inline: true});
    

    embed.addFields({name: "Feature List", value: "Here are the commands and settings for each feature. You can configure them in the 'Configure' menu.", inline: false});
    // ======
    // Features

    // Wordle
    let wordleString = ``;
    wordleString += `Commands:${wordleCommands.length > 0 ? `\n - ${wordleCommands.join("\n- ")}` : `\nNone`}`;
    wordleString += `\n-----\nResults Scanning: ${guildData.messageScanning.wordleResultScanning ? "\`Enabled\`" : "\`Disabled\`"}\n`;

    embed.addFields({
        name: '🔠 Wordle',
        value: wordleString,
        inline: true
    });
    
    // Starboard
    let starboardString = ``;
    starboardString += `Commands:${starboardCommands.length > 0 ? `\n - ${starboardCommands.join("\n- ")}` : `\nNone`}`;

    starboardString += `\n-----\nReaction Scanning: ${guildData.messageScanning.starboardScanning ? "\`Enabled\`" : "\`Disabled\`"}\n`;
    starboardString += `\nChannel: ${guildData.channels.starboardChannelId != "" ? `<#${guildData.channels.starboardChannelId}>` : "`Not set`"}\n`;

    /*starboardString += `- Channel: ${guildData.channels.starboardChannelId ? `<#${guildData.channels.starboardChannelId}>\n` : `Not set`}`;
    starboardString += `- Emoji: ${guildData.starboard.emoji}`;
    starboardString += `- Threshold: ${guildData.starboard.threshold}\n`;
    starboardString += `- Success Emoji: ${guildData.starboard.successEmoji}\n`;
    starboardString += `- Blacklist?: ${guildData.starboard.blacklistEnabled ? "Enabled" : "Disabled"}\n`;
    if (guildData.starboard.blacklistChannels.length > 0 ) starboardString += ` - Blacklisted Channels: ${guildData.starboard.blacklistChannels.map((channelId) => `<#${channelId}>`).join(', ')}`;
    */
    
    embed.addFields({
        name: '🌟 Starboard',
        value: starboardString,
        inline: true
    });

    // Music
    let musicString = `Commands:${musicCommands.length > 0 ? `\n - ${musicCommands.join("\n- ")}`: `\nNone`}`;
    
    embed.addFields({
        name: '🎵 Music',
        value: musicString,
        inline: true
    });

    // Twitter Embed Fix
    let twitterString = `URL Scanning: ${guildData.messageScanning.twitterEmbedFix ? "\`Enabled\`": "\`Disabled\`"}\n`;
    embed.addFields({
        name: '🐥 Twitter/X Embed Fix',
        value: twitterString,
        inline: true
    });

    // Confessions
    let confessionString = `Commands:${confessionCommands.length > 0 ? `\n - ${confessionCommands.join("\n- ")}`: ``}`;
    confessionString += `\n-----\nChannel: ${guildData.channels.confessionChannelId != "" ? `<#${guildData.channels.confessionChannelId}>` : "`Not set`"}\n`;
    embed.addFields({
        name: '😶 Confessions',
        value: confessionString,
        inline: true
    });




    const navigation: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();
    const list = new ButtonBuilder()
        .setCustomId('home')
        .setStyle(ButtonStyle.Secondary)
        .setLabel("Home")
        .setEmoji({ name: "🏠" });
    const toggle = new ButtonBuilder()
        .setCustomId('toggle')
        .setStyle(ButtonStyle.Primary)
        .setLabel("Toggle")
        .setEmoji({ name: "🔳" });
    const configure = new ButtonBuilder()
        .setCustomId('configure')
        .setStyle(ButtonStyle.Success)
        .setLabel("Configure")
        .setEmoji({ name: "📝" });

    navigation.addComponents(list, toggle, configure);

    const response = await interaction.editReply({ content: "", embeds: [embed], components: [navigation]});


    const collectorFilter = (i: { user: { id: string; }; }) => i.user.id === interaction.user.id;
    const buttonResponse = await response.awaitMessageComponent({ filter: collectorFilter, time: 60000 });
    if (buttonResponse.user == interaction.user ) {
        await buttonResponse.deferUpdate();
        switch (buttonResponse.customId) {
            case 'home':
                await homeMenu(interaction);
            case 'toggle':
                break;
            case 'configure':
                break;
        }
    }
    
}

const checkPermission = async ( interaction: CommandInteraction ): Promise<boolean> => {
    if (!interaction.guild) {
        const messageContent: string = "This command can only be used in a server.";
        if (interaction.replied || interaction.deferred ) await interaction.editReply({content: messageContent})
        else await interaction.reply({content: messageContent, ephemeral: true});
        return false;
    }
    if (!hasPermissions(requiredPermissions, interaction.guild, interaction.user)) {
        const messageContent: string = "You do not have permission to use this command. You gotta have the `MANAGE SERVER` permission to, well, manage the server.";
        if (interaction.replied || interaction.deferred ) await interaction.editReply({content: messageContent})
        else await interaction.reply({content: messageContent, ephemeral: true});
        return false;
    }
    console.log("Permission check passed.")
    return true;

}

const enableFeature = async ( interaction: CommandInteraction, featureName: string, embed: EmbedBuilder ): Promise<EmbedBuilder> => {
    if ( !interaction.guild || !interaction.guildId ) { return embed; }

    switch (featureName) {
        case "wordle":
            // Check if feature is already enabled
            if (await areWordleFeaturesEnabled(interaction.guildId)) {
                embed.setDescription("Wordle features are already enabled.");
            } else {
                embed.setDescription(await enableWordleFeatures(interaction.guildId));
            }
            break;

        case "starboard":
            // Check if feature is already enabled
            if (await isStarboardEnabled(interaction.guildId)) {
                embed.setDescription("Starboard feature is already enabled.");
            } else {
                embed.setDescription(await enableStarboardFeature(interaction.guildId));
            }
            break;

        case "twitterembedfix":
            // Check if feature is already enabled
            if (await isTwitterEmbedFixEnabled(interaction.guildId)) {
                embed.setDescription("Twitter Embed Fix feature is already enabled.");
            } else {
                embed.setDescription(await toggleTwitterEmbedFix(interaction.guildId, true));
            }
            break;

        default:
            embed.setDescription(`Sorry! The feature ${featureName} doesn't exist.`);
            break;

    }

    return embed;
}

const disableFeature = async ( interaction: CommandInteraction, featureName: string, embed: EmbedBuilder ): Promise<EmbedBuilder> => {
    if ( !interaction.guild || !interaction.guildId ) { return embed; }

    switch (featureName) {
        case "wordle":
            // Check if feature is already disabled
            if (!await areWordleFeaturesEnabled(interaction.guildId)) {
                embed.setDescription("Wordle features are already disabled.");
            } else embed.setDescription(await disableWordleFeatures(interaction.guildId));
            break;
        case "starboard":
            // Check if feature is already disabled
            if (!await isStarboardEnabled(interaction.guildId)) {
                embed.setDescription("Starboard feature is already disabled.");
            }
            else embed.setDescription(await disableStarboardFeature(interaction.guildId));
            break;

        case "twitterembedfix":
            // Check if feature is already enabled
            if (!await isTwitterEmbedFixEnabled(interaction.guildId)) {
                embed.setDescription("Twitter Embed Fix feature is already disabled.");
            } else {
                embed.setDescription(await toggleTwitterEmbedFix(interaction.guildId, false));
            }
            break;
        default:
            embed.setDescription(`Sorry! The feature ${featureName} doesn't exist.`);
            break;
    }

    return embed;
}



/* Example usage:
    /settings enableCommand poke
    /settings disableCommand avatar
    /settings enableFeature wordle


*/
/*export const guildSettings: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('View and modify server-specific bot settings')
        // Command Settings
        .addSubcommandGroup((group) =>
            group
                .setName('command')
                .setDescription('Modify command settings')
                // Enable command
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('enable')
                        .setDescription('Enable a command for this server')
                        .addStringOption((option) =>
                            option
                                .setName('command')
                                .setDescription('The command to enable')
                                .setRequired(true)
                        )
                )
                // Disable command
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('disable')
                        .setDescription('Disable a command for this server')
                        .addStringOption((option) =>
                            option
                                .setName('command')
                                .setDescription('The command to disable')
                                .setRequired(true)
                        )
                )
                // List commands
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('list')
                        .setDescription('List all commands for this server')
                )
        )
        // Features
        .addSubcommandGroup((group) =>
            group
                .setName('feature')
                .setDescription('Modify feature settings')
                // Enable feature
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('enable')
                        .setDescription('Enable a feature for this server')
                        .addStringOption((option) =>
                            option
                                .setName('feature')
                                .setDescription('The feature to enable')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Wordle', value: 'wordle' },
                                    { name: 'Starboard', value: 'starboard' },
                                    { name: 'TwitterEmbedFix', value: 'twitterembedfix' }
                                )
                        )
                )
                // Disable feature
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('disable')
                        .setDescription('Disable a feature for this server')
                        .addStringOption((option) =>
                            option
                                .setName('feature')
                                .setDescription('The feature to disable')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Wordle', value: 'wordle' },
                                    { name: 'Starboard', value: 'starboard' },
                                    { name: 'TwitterEmbedFix', value: 'twitterembedfix' }
                                )
                        )
                )
                // List features
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName('list')
                        .setDescription('List all features for this server')
                )
        )

        
        // List all settings
        .addSubcommand((subcommand) =>
            subcommand
                .setName('list')
                .setDescription('List all settings for this server')
        )

        // Help
        .addSubcommand((subcommand) =>
            subcommand
                .setName('help')
                .setDescription('Get help on this command')
        )
        ,
    run: async (interaction) => {
        // Disable context menu
        if (!interaction.isChatInputCommand()) {
            await interaction.editReply('This command cannot be used in a context menu');
            return;
        }
        // Disable DMS
        if (!interaction.guildId || !interaction.guild) {
            await interaction.editReply('This command cannot be used in DMs');
            return;
        }

        let embedToSend: EmbedBuilder = new EmbedBuilder();
        embedToSend
            .setTitle('Server Settings')
            .setDescription('Configuration for ' + interaction.guild.name)
            .setTimestamp()
            .setFooter({text: "To modify these settings, use the /settings subcommands."});
        switch (interaction.options.getSubcommandGroup()) {
            case 'command':
                switch (interaction.options.getSubcommand()) {
                    case 'enable':
                        // Enable a command
                        if (!checkPermission(interaction)) return;
                        commandNotImplemented(interaction, 'enableCommand');
                        return;
                    case 'disable':
                        // Disable a command
                        if (!checkPermission(interaction)) return;
                        commandNotImplemented(interaction, 'disableCommand');
                        return;
                    case 'list':
                        // List all commands
                        commandNotImplemented(interaction, 'listCommands');
                        return;
                }
                break;
            
            case 'feature':
                switch (interaction.options.getSubcommand()) {
                    case 'enable':
                        // Enable a feature
                        if (!checkPermission(interaction)) return;
                        embedToSend = await enableFeature(interaction, interaction.options.getString('feature', true), embedToSend);
                        break;
                    case 'disable':
                        // Disable a feature
                        if (!checkPermission(interaction)) return;
                        embedToSend = await disableFeature(interaction, interaction.options.getString('feature', true), embedToSend);
                        break;
                    case 'list':
                        // List all features
                        commandNotImplemented(interaction, 'listFeatures');
                        return;
                }
                break;

            default:
                switch (interaction.options.getSubcommand()) {
                    case 'list':
                        embedToSend = await displaySettingsList(interaction, embedToSend);
                        break;
                    case 'help':
                        embedToSend = await displaySettingsOverview(interaction, embedToSend);
                        break;
                }
        }
        if (embedToSend !== undefined) {
            await interaction.editReply({ embeds: [embedToSend] });
            return;
        } else {
            console.error('No embed to send');
            await interaction.editReply('An error occurred');
            return;
        }
        
        

    },
    properties: {
        Name: 'Settings',
        Aliases: ['Config', 'Server Settings', 'Server Config'],
        Scope: 'global',
        GuildOnly: true,
        Enabled: true,
        DefaultEnabled: true,
        Intents: [],
        CanBeDisabled: false
    }
}*/


const homeMenu = async (interaction: CommandInteraction) => {
    if (!interaction.guildId || !interaction.guild || !interaction.isChatInputCommand()) return;
    const author = interaction.user;

    let embedToSend: EmbedBuilder = new EmbedBuilder();
    embedToSend
        .setTitle('Server Settings for ' + interaction.guild.name)
        .setTimestamp()
        .setFooter({text: "To modify these settings, use the /settings subcommands."});

    let description = `**Welcome to the settings menu!**\n`;
    description += "Using this interface, you can edit server-specific settings and turn features and commands on/off.\n";
    description += "Features are behaviors that run in the background, like scanning for wordle results, and sometimes require additional permissions to be given to the bot.\n";
    description += "Some commands/features are enabled by default, and some are disabled by default.\n";
    description += "In order to enable a command or feature, you must have the `Manage Server` permission.\n";
    description += "You can navigate between pages using the buttons below this embed.\n";

    embedToSend.setDescription(description);

    // We will use an action menu to move between each page
    const navigation: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();
    const list = new ButtonBuilder()
        .setCustomId('list')
        .setStyle(ButtonStyle.Secondary)
        .setLabel("List")
        .setEmoji({ name: "📃" });
    const toggle = new ButtonBuilder()
        .setCustomId('toggle')
        .setStyle(ButtonStyle.Primary)
        .setLabel("Toggle")
        .setEmoji({ name: "🔳" });
    const configure = new ButtonBuilder()
        .setCustomId('configure')
        .setStyle(ButtonStyle.Success)
        .setLabel("Configure")
        .setEmoji({ name: "📝" });

    navigation.addComponents(list, toggle, configure);

    const response = await interaction.editReply({ content: "", embeds: [embedToSend], components: [navigation]});

    const collectorFilter = (i: { user: { id: string; }; }) => i.user.id === author.id;
    try {
        const buttonResponse = await response.awaitMessageComponent({ filter: collectorFilter, time: 60000 });
        if (buttonResponse.user == author ) {
            await buttonResponse.deferUpdate();
            switch (buttonResponse.customId) {
                case 'list':
                    await commandFeatureList(interaction);
                case 'toggle':
                    break;
                case 'configure':
                    break;
            }
        }
    } catch (e) {}
}


export const guildSettings: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('View and modify server-specific bot settings')
    ,
    run: async (interaction) => {
        // Disable context menu
        if (!interaction.isChatInputCommand()) {
            await interaction.editReply('This command cannot be used in a context menu');
            return;
        }
        // Disable DMS
        if (!interaction.guildId || !interaction.guild) {
            await interaction.editReply('This command cannot be used in DMs');
            return;
        }

        // Check user permissions- are they an administrator or a user?
        const canManageGuild = checkPermission(interaction);
        if (!canManageGuild) return;

        
        interaction.editReply({content: "Loading guild settings, this might take a moment..."});
        guildData = await getGuildDataByGuildID(interaction.guildId);
        enabledDisabledCommands = await getEnabledDisabledCommands(interaction.guildId);
          
        await homeMenu(interaction);

    },
    properties: {
        Name: 'Settings',
        Aliases: ['Config', 'Server Settings', 'Server Config'],
        Scope: 'global',
        GuildOnly: true,
        Enabled: true,
        DefaultEnabled: true,
        Intents: [],
        CanBeDisabled: false
    }
}
    