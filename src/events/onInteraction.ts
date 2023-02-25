import { CommandList } from '../commands/_CommandList';
import { Interaction } from 'discord.js';

// Handles onInteraction event
export const onInteraction = async (interaction: Interaction) => {
    console.log("Registering onInteraction event...")
    // If interaction is a command
    if (interaction.isCommand()) {
        // Check if command matches any registered commands
        for (const Command of CommandList) {
            if (interaction.commandName === Command.data.name) {
                // If command matches, run command
                await Command.run(interaction);
                return;
            }
        }
    }
    console.log("Registered onInteraction event.")
}