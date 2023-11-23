import { CommandList } from '../commands/_CommandList.js';
import { Interaction } from 'discord.js';
import { EventInterface } from '../interfaces/Event.js';
import { broadcastCommandFailed, isCommandDisabled, isCommandEnabled } from '../utils/commandUtils.js';
import { hasPermissions } from '../utils/userUtils.js';

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
                for (const Command of CommandList) {
                    // If command matches and is not globally disabled
                    if (interaction.commandName === Command.data.name) {
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

                            const commandEnabled = await isCommandEnabled(Command, interaction.guild.id);
                            const commandDisabled = await isCommandDisabled(Command, interaction.guild.id);

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
                            } 
                            // If disabled globally
                            else if (!commandEnabled) {
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

                        console.error(" === Command " + Command.data.name + " failed onInteraction validation- logging error! ===");
                    } 
                }
                console.error("Command failed!");
                await broadcastCommandFailed(interaction, errorList);
            } catch(e) {
                console.error(`Error running command: ${e}`);
                await broadcastCommandFailed(interaction, "An error occurred while running this command.", undefined, e);
            }
        }
    },
    properties: {
        Name: "interactionCreate",
        Enabled: true,
    }

} 