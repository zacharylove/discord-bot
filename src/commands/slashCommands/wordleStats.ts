import { CommandInterface } from 'interfaces/Command';
import { EmbedBuilder, SlashCommandBuilder } from "@discordjs/builders";
import { getRanking, getWordleDataByUserID } from 'database/wordleData';
import { APIEmbedField } from 'discord.js';
import { areWordleFeaturesEnabled } from 'database/guildData';
import { broadcastCommandFailed } from 'utils/commandUtils';

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
    if (ranking.find( (user: any) => user.userID == userID )) {
        // Get user's rank
        const userRank = ranking.findIndex( (user: any) => user.userID == userID ) + 1;
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
            

            // Check if wordle features are enabled (only if on server)
            if (interaction.guild && interaction.guild) {
                if (await areWordleFeaturesEnabled(interaction.guild.id) == false) {
                    await broadcastCommandFailed(interaction, "Wordle features are not enabled on this server!");
                    return;
                }
            }


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
            embed.setThumbnail(user.avatarURL());

            await interaction.editReply({embeds: [embed]});
            


        },
        properties: {
            Name: 'Wordle Stats',
            Scope: 'global',
            GuildOnly: true,
            Enabled: true,
            DefaultEnabled: false,
            Intents: []
        }
}