import { CommandInterface } from 'interfaces/Command';
import { EmbedBuilder, SlashCommandBuilder } from "@discordjs/builders";
import { getRanking } from 'database/wordleData';

export const wordleRanking: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('wordleranking')
        .setDescription("Displays the Wordle ranking"),
    run: async (interaction) => {
        const ranking = await getRanking();
        const rankingEmbed = new EmbedBuilder()
            .setTitle("Wordle Ranking")
            .setDescription("Global top 10 users, ranked by weighted Wordle score")
            .setColor(0x00ff00)
            .setFooter({text: "Weighted Score Formula: 1000*(1/((total # of guesses)/(5 * # puzzles attempted)) * log(# completed * (# completed/# puzzles attempted)))"});

        let counter = 0;
        for (const entry of ranking) {
            if (counter >= 10) break;
            let userID = entry.userID;
            let user = await interaction.client.users.fetch(userID);
            let username = user.username;
            let rank = entry.rank + 1;
            let weightedScore = entry.weightedScore;
        }
    },
    properties:  {
        Name: 'Wordle Ranking',
        Scope: 'global',
        GuildOnly: false,
        Enabled: true,
        DefaultEnabled: false,
        Intents: []

    }
}