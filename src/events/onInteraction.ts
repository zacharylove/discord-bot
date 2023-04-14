import { CommandList } from '../commands/_CommandList';
import { Interaction } from 'discord.js';
import { EventInterface } from '../interfaces/Event';
import { isCommandDisabled, isCommandEnabled } from '../database/guildData';
import { hasPermissions } from '../utils/userUtils';

// Handles onInteraction event
export const onInteraction : EventInterface = {
    run: async (interaction: Interaction) => {
        console.log("Registering onInteraction event...")
        // If interaction is a command
        if (interaction.isCommand()) {
            // Check if command matches any registered commands
            for (const Command of CommandList) {
                // If command matches and is not globally disabled
                if (interaction.commandName === Command.data.name) {
                    let errorList: string[] = [];
                    console.debug("User " + interaction.user.tag + " called command " + Command.data.name + ", validating...");
                    // If disabled globally
                    if (!Command.properties.Enabled) {
                        console.debug("Command " + Command.data.name + " is disabled globally.");
                        errorList.push("Command " + Command.data.name + " is disabled globally.");
                    }

                    // If sent in guild
                    if (interaction.guild) {

                        const commandEnabled = await isCommandEnabled(Command, interaction.guild.id);
                        const commandDisabled = await isCommandDisabled(Command, interaction.guild.id);

                        // If user has permissions
                        if (Command.properties.Permissions) {
                            if ( !hasPermissions( Command.properties.Permissions, interaction.guild, interaction.user ) ) {
                                errorList.push("You are missing the following permissions: `" + Command.properties.Permissions.join(", ") + "`.");
                            }
                        }

                        // If disabled in guild
                        if (commandDisabled) {
                            console.debug("Command " + Command.data.name + " has been disabled in guild " + interaction.guild.id + ".");
                            errorList.push("Command `" + Command.data.name + "` has been disabled in this server.");
                        } else if (!commandEnabled) {
                            console.debug("Command " + Command.data.name + " is not enabled in guild " + interaction.guild.id + ".");
                            errorList.push("Command `" + Command.data.name + "` is disabled by default and has not been enabled in this server.");
                        }
                        
                        // If command is enabled in the guild or enabled globally and not disabled in guild
                        if ( (!Command.properties.DefaultEnabled && commandEnabled) || (Command.properties.DefaultEnabled && !commandDisabled) ) {
                            if ( errorList.length > 0 ) {
                                console.error("Command " + Command.data.name + " failed validation but was run anyways!");
                            }
                            await Command.run(interaction);
                            return;
                        }
                    }
                    // If command is in DMs and is not restricted to guilds
                    if (!interaction.guild && !Command.properties.GuildOnly) {
                        await Command.run(interaction);
                        return;
                    }

                    // Send command failed output (if any)
                    if (errorList.length > 0) {
                        let errorMessage: string = "**Command failed"

                        // Send a bulleted list of reasons if there are many
                        if (errorList.length > 1) {
                            errorMessage += " for " + errorList.length + " reasons:**";
                            for (const error of errorList) {
                                errorMessage += "\n - " + error;
                            }

                            // Add another reason just for funsies
                            if ( errorList.length > 2 ) errorMessage += "\n - And a partridge in a pear tree!";
                        }
                        // If there's only one reason, just send it
                        else {
                            errorMessage += ":** " + errorList[0];
                        }
                        await interaction.reply(errorMessage);
                        return;
                    } else {
                        console.error("Command " + Command.data.name + " failed validation but no error was logged!");
                    }
                }
            }

            await interaction.reply("Oopsie woopsy! Something made a lil' fucky wucky in the backy-endy >w<\nThis weawwy shouldn't happen... pwease contact inco for a fix :3c")
            console.debug("Command failed!");
        }
        console.log("Registered onInteraction event.")
    },
    properties: {
        Name: "interactionCreate",
        Enabled: true,
    }

} 