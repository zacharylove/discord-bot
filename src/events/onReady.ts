// On bot startup
import { Client } from "discord.js";
import { Routes } from "discord-api-types/v9";
import { REST } from "@discordjs/rest";
import { CommandList } from "../commands/_CommandList";
import { CommandProperties } from "../interfaces/Command";
import { onTick } from "../events/onTick";
import { IntentOptions } from "config/IntentOptions";
import { EventInterface } from "interfaces/Event";
import { validateIntents } from "../utils/validateProperties";

const registerCommands = async (BOT: Client) => {
    const rest = new REST({ version: "9" }).setToken(process.env.BOT_TOKEN as string);
    // Separate commands into guild and global commands
    var guildCommands = [];
    var globalCommands = [];
    for (const Command of CommandList) {
        // Check if we have the correct intents for the command
        if (!validateIntents(Command.properties.Intents, "onReady")) continue;

        if (Command.properties.Scope === 'guild') {
            guildCommands.push(Command.data.toJSON());
        } else if (Command.properties.Scope === 'global') {
            globalCommands.push(Command.data.toJSON());
        }
        
    }

    // Register guild commands
    await rest.put(
        Routes.applicationGuildCommands(
            BOT.user?.id || "missing id",
            process.env.GUILD_ID as string
        ),
        { body: guildCommands}
    );
    console.log(`Registered ${guildCommands.length} guild commands.`);

    // Register global commands
    await rest.put(
        Routes.applicationCommands(
            BOT.user?.id || "missing id",
        ),
        { body: globalCommands}
    );
    console.log(`Registered ${globalCommands.length} global commands.`);
};


export const onReady : EventInterface = {
    run: async (BOT: Client) => {
        console.log(`Logged in as ${BOT.user?.tag}!`);
        console.log("Registering onReady event...");
        // Register commands
        registerCommands(BOT).catch(console.error);

        // Set tick event to run every set interval
        if (onTick.properties.Enabled && validateIntents(onTick.properties.Intents, "onTick", "event")) {
            console.log("Setting tick event to run every " + process.env.TICK_INTERVAL + "ms.")
            setInterval(() => onTick.run(BOT), parseInt(process.env.TICK_INTERVAL as string));
        }
        console.log("Registered onReady event.");

        console.log("Bot ready.\n\n")
    },
    properties: {
        Name: "ready",
        Enabled: true,
    }
}