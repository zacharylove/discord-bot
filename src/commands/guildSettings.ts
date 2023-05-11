// View a list of guild-specific settings and enable/disable commands and features.
import { CommandInterface } from "../interfaces/Command";
import { SlashCommandBuilder, EmbedBuilder } from "@discordjs/builders";
import { areWordleFeaturesEnabled, disableWordleFeatures, enableWordleFeatures, getDisabledCommandListAsString, getEnabledCommandListAsString, getGuildDataByGuildID } from "../database/guildData";
import { GuildDataInterface } from "../database/models/guildModel";
import { getCommandListAsString } from "../utils/commandUtils";
import { CommandInteraction, Embed, PermissionsBitField, User } from "discord.js";
import { hasPermissions } from "../utils/userUtils";


// Required permission to enable/disable
const requiredPermissions = PermissionsBitField.Flags.ManageGuild;

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
const displaySettingsList = async (interaction: CommandInteraction, embed: EmbedBuilder): Promise<EmbedBuilder>  => {
    // shut up typescript
    if ( !interaction.guild || !interaction.guildId ) { return embed; }

    // List all settings
    const guildData: GuildDataInterface = await getGuildDataByGuildID(interaction.guildId);

    let description: string = "Configuration for " + interaction.guild.name;
    description += "Here, you can enable and disable commands and features for this server. \n"
    description += "For more information, use `/settings help`.\n"

    // Now remember:
    // - Globally disabled commands are disabled everywhere
    // - Globally enabled commands are enabled UNLESS they are specifically disabled
    // 

    // This loops twice, but who cares- there's not gonna be THAT many commands
    const enabledCommandList: string[] = await getEnabledCommandListAsString(interaction.guildId);
    const disabledCommandList: string[] = await getDisabledCommandListAsString(interaction.guildId);
    const availableCommandList: string[] = await getCommandListAsString();


    let enabledCommandsString: string = 'None';
    let disabledCommandsString: string = 'None';
    let availableCommandsString: string = 'None';
    let contentScanningString: string = '';

    if ( availableCommandList.length > 0 ) {
        availableCommandsString = " - " + availableCommandList.join('\n - ');
    }
    embed.addFields({name: 'Available Commands', value: availableCommandsString, inline: true});

    if ( enabledCommandList.length > 0 ) {
        enabledCommandsString = " - " + enabledCommandList.join('\n - ');
    }
    embed.addFields({name: 'Enabled', value: enabledCommandsString, inline: true});
    if ( disabledCommandList.length > 0 ) {
        disabledCommandsString = " - " + disabledCommandList.join('\n - ');
    }
    embed.addFields({name: 'Disabled', value: disabledCommandsString, inline: true});
    
    // ======
    // Features
    

    contentScanningString += "Wordle Results Scanning: ";
    if ( guildData.messageScanning.wordleResultScanning ) {
        contentScanningString += "Enabled\n";
    } else { contentScanningString += "Disabled\n"; }

    embed.addFields({name: 'Available Features', value: contentScanningString});

    return embed;
}

const checkPermission = async ( interaction: CommandInteraction ): Promise<boolean> => {
    if (!interaction.guild) {
        const messageContent: string = "This command can only be used in a server.";
        if (interaction.replied) await interaction.editReply({content: messageContent})
        else await interaction.reply({content: messageContent, ephemeral: true});
        return false;
    }
    if (!hasPermissions(requiredPermissions, interaction.guild, interaction.user)) {
        const messageContent: string = "You do not have permission to use this command. You gotta have the `MANAGE SERVER` permission to, uh, manage the server.";
        if (interaction.replied) await interaction.editReply({content: messageContent})
        else await interaction.reply({content: messageContent, ephemeral: true});
        return false;
    }
    console.log("Permission check passed.")
    return true;

}

const enableFeature = async ( interaction: CommandInteraction, featureName: string, embed: EmbedBuilder ): Promise<EmbedBuilder> => {
    if ( !interaction.guild || !interaction.guildId ) { return embed; }

    if (featureName == "wordle") {
        // Check if feature is already enabled
        if (await areWordleFeaturesEnabled(interaction.guildId)) {
            embed.setDescription("Wordle features are already enabled.");
        } else {
            embed.setDescription(await enableWordleFeatures(interaction.guildId));
        }
    } else{
        embed.setDescription("That feature doesn't exist. It's just wordle right now lol");
    }

    return embed;
}

const disableFeature = async ( interaction: CommandInteraction, featureName: string, embed: EmbedBuilder ): Promise<EmbedBuilder> => {
    if ( !interaction.guild || !interaction.guildId ) { return embed; }

    if (featureName == "wordle") {
        // Check if feature is already disabled
        if (!await areWordleFeaturesEnabled(interaction.guildId)) {
            embed.setDescription("Wordle features are already disabled.");
        } else {
            await disableWordleFeatures(interaction.guildId);
            embed.setDescription("Wordle features are now disabled.");
        }
    } else{
        embed.setDescription("That feature doesn't exist. It's just wordle right now lol");
    }

    return embed;
}

const apologizeForFailure = async ( interaction: CommandInteraction, commandName: string ): Promise<void> => {
    interaction.editReply("Yeah, uh, the `" + commandName + "` command isn't implemented yet. Sorry.");
    return;
}

/* Example usage:
    /settings enableCommand poke
    /settings disableCommand avatar
    /settings enableFeature wordle


*/
export const guildSettings: CommandInterface = {
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
            interaction.editReply('This command cannot be used in a context menu');
            return;
        }
        // Disable DMS
        if (!interaction.guildId || !interaction.guild) {
            interaction.editReply('This command cannot be used in DMs');
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
                        apologizeForFailure(interaction, 'enableCommand');
                        return;
                    case 'disable':
                        // Disable a command
                        if (!checkPermission(interaction)) return;
                        apologizeForFailure(interaction, 'disableCommand');
                        return;
                    case 'list':
                        // List all commands
                        apologizeForFailure(interaction, 'listCommands');
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
                        apologizeForFailure(interaction, 'disableFeature');
                        return;
                    case 'list':
                        // List all features
                        apologizeForFailure(interaction, 'listFeatures');
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
            interaction.editReply({ embeds: [embedToSend] });
            return;
        } else {
            console.error('No embed to send');
            interaction.editReply('An error occurred');
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
}
