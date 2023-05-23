import { CommandInterface } from "../interfaces/Command";
import { GatewayIntentBits } from "discord.js";
import { SlashCommandBuilder, EmbedBuilder } from "@discordjs/builders";
import { BOT } from "../index";
import { countGuilds } from "../database/guildData";
import { countUsers } from "../database/userData";
import { IntentOptions } from "../config/IntentOptions";
import { intentEnumToString } from "../utils/utils";


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
        description += "**Current guilds**: " + BOT.guilds.cache.size + "\n";
        description += "**Total guilds**: " + await countGuilds() + "\n";
        description += "**Total users**: " + await countUsers() + "\n";
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