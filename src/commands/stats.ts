import { CommandInterface } from "../interfaces/Command";
import { GatewayIntentBits } from "discord.js";
import { SlashCommandBuilder, EmbedBuilder } from "@discordjs/builders";
import { BOT } from "../index";
import { countGuilds, getGlobalGuildCounterStats } from "../database/guildData";
import { countUsers } from "../database/userData";
import { IntentOptions, PartialsOptions } from "../config/IntentOptions";
import { intentEnumToString } from "../utils/utils";
import CommandList from "./_CommandList";
import { getGlobalWordleStats } from "../database/wordleData";


export const stats: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View bot stats'),
    run: async (interaction) => {

        let embedToSend: EmbedBuilder = new EmbedBuilder();
        embedToSend
            .setTitle('Bot Statistics')
            .setTimestamp();

        let description: string = "";

        if (BOT.uptime) {
            let totalSeconds = (BOT.uptime / 1000);
            let days = Math.floor(totalSeconds / 86400);
            totalSeconds %= 86400;
            let hours = Math.floor(totalSeconds / 3600);
            totalSeconds %= 3600;
            let minutes = Math.floor(totalSeconds / 60);
            let seconds = Math.floor(totalSeconds % 60);
            description += `**Uptime**: ${days}D ${hours}H ${minutes}M ${seconds}S \n`;
        }

        const globalGuildCounterStats = await getGlobalGuildCounterStats();
        const globalWordleStats = await getGlobalWordleStats();

        description += "**Current guilds**: " + BOT.guilds.cache.size + "\n";
        description += "**Total guilds in database**: " + await countGuilds() + "\n";
        description += "**Total users in database**: " + await countUsers() + "\n";
        description += "**Total commands**: " + CommandList.length + "\n";
        description += "**Total # of confessions**: " + globalGuildCounterStats.numConfessions + "\n";
        description += "**Total # of starboard posts**: " + globalGuildCounterStats.numStarboardMessages + "\n";
        description += "**Total # of wordle results processed**: " + globalWordleStats.numWordleResults + "\n";
        description += "**Total # of wordle guesses processed**: " + globalWordleStats.numWordleGuesses + "\n";
        description += "**Required Intents**: ";
        description += IntentOptions.map( a => intentEnumToString(a) ).join(", ") + "\n";

        embedToSend.setDescription(description);

        interaction.editReply({ embeds: [embedToSend] });
        return;
    },
    properties: {
        Name: 'Stats',
        Aliases: ['Bot Stats', 'Bot Statistics', 'Statistics'],
        Scope: 'global',
        GuildOnly: false,
        Enabled: true,
        DefaultEnabled: true,
        Intents: [],
        CanBeDisabled: false
    }
}