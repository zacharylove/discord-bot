import { CommandInterface, CommandProperties } from '../interfaces/Command';
import { EmbedBuilder, SlashCommandBuilder } from "@discordjs/builders";
import { getUserData } from '../database/userData';
import { getRanking, getWordleDataByUserID } from '../database/wordleData';
import { APIEmbedField } from 'discord.js';

/**
     * Gets wordle stats for a user
     * @param userID 
     * @returns a map of prettified stats
     */
const getWordleStats = async (userID: string) => {
    const userData = await getWordleDataByUserID(userID);
    // Fetch ranking
    const ranking = await getRanking();
    // If user in ranking
    let userRanking = 0;
    if (ranking.find( (user) => user.userID == userID )) {
        // Get user's rank
        const userRank = ranking.findIndex( (user) => user.userID == userID ) + 1;
        userRanking = userRank;
    }

    let stats = new Map<string, string>();
    stats.set("Puzzles attempted", userData.totalPuzzles.toString());
    stats.set("Puzzles completed", userData.numComplete.toString());

    stats.set("Average guesses per puzzle", userData.totalAverage.toFixed(2));
    stats.set("Weighted score", userData.weightedScore.toString());
    if (userRanking != 0) stats.set("Ranking", userRanking.toString());

    return stats;
}


export const wordleStats: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('wordlestats')
        .setDescription("Displays Wordle statistics for the given user (or the calling user, if no target is specified)")
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to display Wordle statistics for')
                .setRequired(false)
        ),
        run: async (interaction) => {
            await interaction.deferReply();
            const target = interaction.options.getUser('user');
            let user;
            if (!target) {
                user = interaction.user
            } else {
                user = target;
                if (user.bot) {
                    await interaction.editReply("Bots can't play Wordle!");
                    return;
                }
            }

            const stats = await getWordleStats(user.id);
            var embed = new EmbedBuilder();
            var fields: APIEmbedField[] = [];
            for (const [key, value] of stats) {
                fields.push({
                    name: key,
                    value: value,
                    inline: true
                })

            }

            embed.addFields(fields);
            embed.setTitle(`Wordle stats for ${user.username}`);
            embed.setThumbnail(interaction.user.avatarURL());

            await interaction.editReply({embeds: [embed]});
            


        },
        properties: new Map<CommandProperties, string>([
            [CommandProperties.Name, 'Wordle Stats'],
            [CommandProperties.Scope, 'global'],
            [CommandProperties.Enabled, 'true']
        ])
}