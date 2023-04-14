// View a list of guild-specific settings and enable/disable commands and features.
import { CommandInterface } from "../interfaces/Command";
import { SlashCommandBuilder, EmbedBuilder } from "@discordjs/builders";
import { getDisabledCommandListAsString, getEnabledCommandListAsString, getGuildDataByGuildID } from "../database/guildData";
import { GuildDataInterface } from "../database/models/guildModel";
import { getCommandListAsString } from "../utils/commandUtils";

// Settings command
// If no arguments are provided, display a list of all guild-specific settings

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
        
        // View all settings
        .addSubcommand((subcommand) =>
            subcommand
                .setName('list')
                .setDescription('List all settings for this server')
        )
        ,
    run: async (interaction) => {
        await interaction.deferReply();
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

        switch (interaction.options.getSubcommandGroup()) {
            case 'command':
                switch (interaction.options.getSubcommand()) {
                    case 'enable':
                        // Enable a command
                        interaction.editReply('Enable command');
                        break;
                    case 'disable':
                        // Disable a command
                        interaction.editReply('Disable command');
                        break;
                    case 'list':
                        // List all commands
                        interaction.editReply('List commands');
                        break;
                }
                break;
            
            case 'feature':
                switch (interaction.options.getSubcommand()) {
                    case 'enable':
                        // Enable a feature
                        interaction.editReply('Enable feature');
                        break;
                    case 'disable':
                        // Disable a feature
                        interaction.editReply('Disable feature');
                        break;
                    case 'list':
                        // List all features
                        interaction.editReply('List features');
                }
                break;

            default:
                if (interaction.options.getSubcommand() === 'list') {
                    // List all settings
                    const guildData: GuildDataInterface = await getGuildDataByGuildID(interaction.guildId);

                    let description: string = "Configuration for " + interaction.guild.name;
                    description += "Here, you can enable and disable commands and features for this server. Features are behaviors that run in the background, like scanning for wordle results, and sometimes require additional permissions to be given to the bot.Some commands/features are enabled by default, and some are disabled by default.\n"
                    description += "To enable/disable a command, use `/settings command <enable/disable> <command name>`.\n";
                    description += "To enable/disable a feature, use `/settings feature <enable/disable> <feature name>`.\n";


                    const embed = new EmbedBuilder()
                        .setTitle('Server Settings')
                        .setDescription('Configuration for ' + interaction.guild.name)
                        .setTimestamp()
                        .setFooter({text: "To modify these settings, use the /settings subcommands."});

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


                    interaction.editReply({ embeds: [embed] });
                    break;
                }
                else {
                    // Invalid subcommand
                    interaction.editReply('An error has occurred!!');
                    break;
                }

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
