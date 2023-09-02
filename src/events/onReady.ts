// On bot startup
import { ActivityType } from "discord.js";
import { Routes } from "discord-api-types/v9";
import { REST } from "@discordjs/rest";
import { CommandList } from "../commands/_CommandList";
import { onTick } from "../events/onTick";
import { EventInterface } from "interfaces/Event";
import { validateIntents } from "../utils/validateProperties";
import { Bot } from "bot";
import { version, statuses } from "../config/config.json";


const registerCommands = async (BOT: Bot) => {
    const rest = new REST({ version: "9" }).setToken(process.env.BOT_TOKEN as string);
    // Separate commands into guild and global commands
    var guildCommands = [];
    var globalCommands = [];
    let commandOutput: string = "Registering the following commands:";
    for (const Command of CommandList) {
        // Check if we have the correct intents for the command
        if (!validateIntents(Command.properties.Intents, "onReady")) {
            continue;
        }
        // Check if command is not globally disabled
        if (!Command.properties.Enabled) continue;

        if (Command.properties.Scope === 'guild') {
            commandOutput += "\n  [Guild] " + Command.properties.Name;
            guildCommands.push(Command.data.toJSON());
        } else if (Command.properties.Scope === 'global') {
            commandOutput += "\n  [Global] " + Command.properties.Name;
            globalCommands.push(Command.data.toJSON());
        }
        
    }
    commandOutput += "\n=== COMMAND REGISTRATION COMPLETE ===";
    console.log(commandOutput);
    // Register guild commands
    await rest.put(
        Routes.applicationGuildCommands(
            BOT.user?.id || "missing id",
            process.env.GUILD_ID as string
        ),
        { body: guildCommands}
    );

    // Register global commands
    await rest.put(
        Routes.applicationCommands(
            BOT.user?.id || "missing id",
        ),
        { body: globalCommands}
    );

    console.log(`Registered ${guildCommands.length} guild commands and ${globalCommands.length} global commands.`)
};


export const onReady : EventInterface = {
    run: async (BOT: Bot) => {
        console.log(`Logged in as ${BOT.user?.tag}!`);
        console.debug("Running onReady event...");
        // Register commands
        registerCommands(BOT).catch(console.error);

        // Rotating activity

        var activityString = "";

        const updateDelay = 5; // in seconds
        let currentIndex = 0;

        if (process.env.TICK_INTERVAL != undefined) {
            setInterval(() => {
                if (!BOT || !BOT.user ) {
                    throw new Error("BOT is undefined in status tick event.");
                }
                activityString = statuses[currentIndex];
                if ( version != "" ) {
                    activityString += " | v" + version;
                }

                BOT.user.setActivity(activityString);
            
                // update currentIndex
                // if it's the last one, get back to 0
                currentIndex = currentIndex >= statuses.length - 1 
                ? 0
                : currentIndex + 1;
            }, updateDelay * parseInt(process.env.TICK_INTERVAL as string));
        }


        // Set tick event to run every set interval
        if (onTick.properties.Enabled && validateIntents(onTick.properties.Intents, "onTick", "event")) {
            console.log("Setting tick event to run every " + process.env.TICK_INTERVAL + "ms.")
            setInterval(() => onTick.run(BOT), parseInt(process.env.TICK_INTERVAL as string));
        }

        console.log("=== Bot ready ===\n\n")
    },
    properties: {
        Name: "ready",
        Enabled: true,
    }
}