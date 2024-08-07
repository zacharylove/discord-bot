// On bot startup
import { Routes } from "discord-api-types/v10";
import { REST } from "@discordjs/rest";
import { CommandList } from "../commands/_CommandList.js";
import { onTick } from "../events/onTick.js";
import { EventInterface } from "../interfaces/Event.js";
import { validateIntents } from "../utils/validateProperties.js";
import Bot from "../bot";
// @ts-ignore
import { default as config } from "../config/config.json" assert { type: "json" };
import { Feature } from "../interfaces/Command.js";


const registerCommands = async (BOT: Bot) => {
    const rest = new REST({ version: "9" }).setToken(process.env.BOT_TOKEN as string);
    // Separate commands into guild and global commands
    var guildCommands = [];
    var globalCommands = [];
    let commandOutput: string = "Registering the following commands:";
    let musicCommandOutput: string = "  === MUSIC ===";
    let wordleCommandOutput: string = "  === WORDLE ===";

    for (const Command of CommandList) {
        // Check if we have the correct intents for the command
        if (!validateIntents(Command.properties.Intents, "onReady")) {
            continue;
        }
        // Check if command is not globally disabled
        if (!Command.properties.Enabled) continue;

        let line = "";

        if (Command.properties.Scope === 'guild') {
            line += "\n  🔰 " + Command.properties.Name;
            guildCommands.push(Command.data.toJSON());
        } else if (Command.properties.Scope === 'global') {
            line += "\n  🌎 " + Command.properties.Name;
            globalCommands.push(Command.data.toJSON());
        }
        
        if (Command.properties.Feature == Feature.Wordle) {
            wordleCommandOutput += line;
        } else if (Command.properties.Feature == Feature.Music) {
            musicCommandOutput += line;
        } else {
            commandOutput += line;
        }
    }
    commandOutput += "\n" + musicCommandOutput + "\n" + wordleCommandOutput;
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

    console.log(`Bot ready. Registered ${guildCommands.length} guild commands and ${globalCommands.length} global commands.`)
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
                activityString = config.statuses[currentIndex];
                if ( config.version != "" ) {
                    activityString += " | v" + config.version;
                }

                BOT.user.setActivity(activityString);
            
                // update currentIndex
                // if it's the last one, get back to 0
                currentIndex = currentIndex >= config.statuses.length - 1 
                ? 0
                : currentIndex + 1;
            }, updateDelay * parseInt(process.env.TICK_INTERVAL as string));
        }


        // Set tick event to run every set interval
        if (onTick.properties.Enabled && validateIntents(onTick.properties.Intents, "onTick", "event")) {
            console.log("Setting tick event to run every " + process.env.TICK_INTERVAL + "ms.")
            setInterval(() => onTick.run(BOT), parseInt(process.env.TICK_INTERVAL as string));
        }

    },
    properties: {
        Name: "ready",
        Enabled: true,
    }
}