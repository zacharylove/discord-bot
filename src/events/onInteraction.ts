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
                if (interaction.commandName === Command.data.name && Command.properties.Enabled) {
                    console.debug("User " + interaction.user.tag + " called command " + Command.data.name + ", validating...");
                    // If command is in guild and has guild scope
                    if (interaction.guild) {
                        const commandEnabled = await isCommandEnabled(Command, interaction.guild.id);
                        const commandDisabled = await isCommandDisabled(Command, interaction.guild.id);

                        // Check permissions
                        if (Command.properties.Permissions) {
                            if ( !hasPermissions( Command.properties.Permissions, interaction.guild, interaction.user ) ) {
                                await interaction.reply("You are missing the following permissions: " + Command.properties.Permissions.join(", ") + ".");
                                return;
                            }
                        }
                        
                        // If command is enabled in the guild or enabled globally and not disabled in guild
                        if ( (!Command.properties.DefaultEnabled && commandEnabled) || (Command.properties.DefaultEnabled && !commandDisabled) ) {
                            await Command.run(interaction);
                            return;
                        }
                    }
                    // If command is in DMs and is not restricted to guilds
                    if (!interaction.guild && !Command.properties.GuildOnly) {
                        await Command.run(interaction);
                        return;
                    }
                }
            }
            console.debug("Command failed!");
        }
        console.log("Registered onInteraction event.")
    },
    properties: {
        Name: "interactionCreate",
        Enabled: true,
    }

} 