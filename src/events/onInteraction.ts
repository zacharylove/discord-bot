import { CommandList } from '../commands/_CommandList.js';
import { Interaction } from 'discord.js';
import { EventInterface } from '../interfaces/Event.js';
import { CommandStatus, broadcastCommandStatus, isCommandDisabled, isCommandEnabled } from '../utils/commandUtils.js';
import { hasPermissions } from '../utils/userUtils.js';
import { CommandInterface } from '../interfaces/Command.js';
import { getCommandByName, logCommandToFile, logErrorToFile } from '../utils/utils.js';
import { addToCommandLog, getGuildDataByGuildID } from '../database/guildData.js';
import { GuildData } from '../database/models/guildModel.js';



// Handles onInteraction event
export const onInteraction : EventInterface = {
    run: async (interaction: Interaction) => {
        console.debug("Received onInteraction event...")

        var interactionDeferred = false;
        
        // If interaction is a command
        if (interaction.isCommand()) {
            
            let errorList: string[] = [];

            try {
                // Check if command matches any registered commands
                const Command = getCommandByName(interaction.commandName);
                if (!Command) {
                    console.error("Command failed!");
                    await broadcastCommandStatus(interaction, CommandStatus.Failed, {reason: "Command does not match any registered command names", error: errorList});
                    return;
                }
                // Defer reply according to properties
                if ( Command.properties.Ephemeral && Command.properties.Ephemeral == true ) {
                    await interaction.deferReply({ephemeral: true});
                    interactionDeferred = true;
                } else if (Command.properties.Defer != false) {
                    await interaction.deferReply();
                    interactionDeferred = true;
                } else {
                    interactionDeferred = false;
                }
                
                console.debug("User " + interaction.user.username + " called command " + Command.data.name + ", validating...");
                // If disabled globally
                if (!Command.properties.Enabled) {
                    console.debug("Command " + Command.data.name + " is disabled globally.");
                    errorList.push("Command " + Command.data.name + " is disabled globally.");
                }


                // If sent in guild
                if (interaction.guild) {
                    const guildData = await getGuildDataByGuildID(interaction.guild.id);

                    const commandEnabled = isCommandEnabled(Command, guildData);
                    const commandDisabled = isCommandDisabled(Command, guildData);

                    // If user has permissions
                    if (Command.properties.Permissions) {
                        if ( !hasPermissions( Command.properties.Permissions, interaction.guild, interaction.user ) ) {
                            errorList.push("You are missing the following permissions: `" + Command.properties.Permissions.join(", ") + "`.");
                        }
                    }

                    // If enabled globally and disabled in guild
                    if (Command.properties.DefaultEnabled && commandDisabled) {
                        console.debug("Command " + Command.data.name + " has been disabled in guild " + interaction.guild.id + ".");
                        errorList.push("Command `" + Command.data.name + "` has been disabled in this server.");
                        await interaction.editReply(`Command ${Command.properties.Name} has been disabled in this server. Use \`/settings\` to enable.`);
                        return;
                    } 
                    // If disabled globally
                    else if (!Command.properties.DefaultEnabled && !commandEnabled) {
                        console.debug("Command " + Command.data.name + " is not enabled in guild " + interaction.guild.id + ".");
                        errorList.push("Command `" + Command.data.name + "` is disabled by default and has not been enabled in this server.");
                        await interaction.editReply(`Command ${Command.properties.Name} is disabled by default and has not been enabled in this server. Use \`/settings\` to enable.`);
                        return;
                    }
                    
                    // If command is enabled in the guild or enabled globally and not disabled in guild
                    if ( (!Command.properties.DefaultEnabled && commandEnabled) || (Command.properties.DefaultEnabled && !commandDisabled) ) {
                        if ( errorList.length > 0 ) {
                            console.error("Command " + Command.data.name + " failed validation but was run anyways!");
                        }
                        await addToCommandLog(guildData, Command, interaction);
                        logCommandToFile(Command, interaction);
                        await Command.run(interaction);
                        return;
                    }
                }
                // If command is in DMs and is not restricted to guilds
                if (!interaction.guild && !Command.properties.GuildOnly) {
                    logCommandToFile(Command, interaction, true);
                    await Command.run(interaction);
                    return;
                }

                console.error(" === Command " + Command.data.name + " failed onInteraction validation- logging error! ===");
            } catch(e) {
                logErrorToFile(e, 'DiscordAPIError');
                await broadcastCommandStatus(interaction, CommandStatus.CriticallyFailed, {reason: "Low-level error occurred"});
            }
        }
        else if (interaction.isAutocomplete()) {
            const command = getCommandByName(interaction.commandName);
            if (!command) {
                console.error("Autocomplete command lookup failed!");
                return;
            }
            if (command.autocomplete) {
                try {
                    await command.autocomplete(interaction);
                } catch (error) {
                    console.error(error);
                }
            }

        }
    },
    properties: {
        Name: "interactionCreate",
        Enabled: true,
    }

} 