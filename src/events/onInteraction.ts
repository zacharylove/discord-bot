import { CommandList } from '../commands/_CommandList';
import { Interaction } from 'discord.js';
import { EventInterface } from 'interfaces/Event';

// Handles onInteraction event
export const onInteraction : EventInterface = {
    run: async (interaction: Interaction) => {
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
    },
    properties: {
        Name: "interactionCreate",
        Enabled: true,
    }

} 