// View a list of guild-specific settings and enable/disable commands and features.
import { CommandInterface, CommandProperties } from "../interfaces/Command";
import { SlashCommandBuilder, EmbedBuilder } from "@discordjs/builders";
import { convertCommandListToString, getGuildDataByGuildID } from "../database/guildData";
import { GuildDataInterface } from "../database/models/guildModel";
import CommandList, { commandListAsString } from "./_CommandList";

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

                    const embed = new EmbedBuilder()
                        .setTitle('Server Settings')
                        .setDescription('Configuration for ' + interaction.guild.name)
                        .setTimestamp()
                        .setFooter({text: "To modify these settings, use the /settings subcommands."});

                    const enabledCommandList: string[] = convertCommandListToString(guildData.commands.enabledCommands);
                    const disabledCommandList: string[] = convertCommandListToString(guildData.commands.disabledCommands);
                    const availableCommandList: string[] = commandListAsString().filter( (command: string) => {
                        return !enabledCommandList.includes(command) && !disabledCommandList.includes(command);
                    })


                    let enabledCommandsString: string = 'None';
                    let disabledCommandsString: string = 'None';
                    let availableCommandsString: string = 'None';
                    let contentScanningString: string = '';

                    if ( availableCommandList.length > 0 ) {
                        availableCommandsString = " - " + availableCommandList.join('\n - ');
                    }
                    embed.addFields({name: 'Available Commands', value: availableCommandsString, inline: true});

                    if ( enabledCommandList.length > 0 ) {
                        enabledCommandsString = " - " + guildData.commands.enabledCommands.join('\n - ');
                    }
                    embed.addFields({name: 'Enabled', value: enabledCommandsString, inline: true});
                    if ( disabledCommandList.length > 0 ) {
                        disabledCommandsString = " - " + guildData.commands.disabledCommands.join('\n - ');
                    }
                    embed.addFields({name: 'Disabled', value: disabledCommandsString, inline: true});
                    
                    contentScanningString += "Wordle Results: ";
                    if ( guildData.messageScanning.wordleResultScanning ) {
                        contentScanningString += "Enabled\n";
                    } else { contentScanningString += "Disabled\n"; }


                    embed.addFields({name: 'Content Scanning', value: contentScanningString});


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
