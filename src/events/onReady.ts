// On bot startup
import { Client } from "discord.js";
import { Routes } from "discord-api-types/v9";
import { REST } from "@discordjs/rest";
import { CommandList } from "../commands/_CommandList";
import { CommandProperties } from "../interfaces/Command";


export const onReady = async (BOT: Client) => {
    console.log(`Logged in as ${BOT.user?.tag}!`);

    const rest = new REST({ version: "9" }).setToken(process.env.BOT_TOKEN as string);

    // Separate commands into guild and global commands
    var guildCommands = [];
    var globalCommands = [];
    for (const Command of CommandList) {
        if (Command.properties.get(CommandProperties.Scope) === 'guild') {
            guildCommands.push(Command.data.toJSON());
        } else if (Command.properties.get(CommandProperties.Scope) === 'global') {
            globalCommands.push(Command.data.toJSON());
        }
    }

    await rest.put(
        Routes.applicationGuildCommands(
            BOT.user?.id || "missing id",
            process.env.GUILD_ID as string
        ),
        { body: guildCommands}
    );
    console.log("Successfully registered guild commands.");

    await rest.put(
        Routes.applicationCommands(
            BOT.user?.id || "missing id",
        ),
        { body: globalCommands}
    );
    console.log("Successfully registered global commands.")
};