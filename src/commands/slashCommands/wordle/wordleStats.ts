import { CommandInterface, Feature } from '../../../interfaces/Command.js';
import { EmbedBuilder, SlashCommandBuilder } from "@discordjs/builders";
import { getRanking, getWordleDataByUserID } from '../../../database/wordleData.js';
import { APIEmbedField, CommandInteraction, User } from 'discord.js';
import { areWordleFeaturesEnabled } from '../../../database/guildData.js';
import { CommandStatus, broadcastCommandStatus } from '../../../utils/commandUtils.js';
import { createCanvas, loadImage } from 'canvas';
import { getAvatarURL } from '../../../utils/userUtils.js';


const buildImage = async (user: User, interaction: CommandInteraction): Promise<Buffer> => {
    // Build 600x600px canvas
    const canvas = createCanvas(600, 415);
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = "#ffffff";
    ctx.roundRect(0, 0, 600, 260, 20);
    ctx.roundRect(65, 290, 120, 120, 20);
    ctx.roundRect(240, 290, 120, 120, 20);
    ctx.roundRect(415, 290, 120, 120, 20);
    ctx.fill();

    // Load user avatar
    // 150x150
    let avatarURL = interaction.guild ? await getAvatarURL(user, interaction.guild.id) : await getAvatarURL(user);
    const userAvatar = await loadImage(avatarURL[1]);
    //const userAvatar = await loadImage(user.avatarURL()!);
    ctx.drawImage(userAvatar, 25, 25, 150, 150);

    // Set font
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#000000';
    // title
    ctx.fillText("Wordle Statistics For", 190, 43, 390);
    ctx.font = '900 40px sans-serif';
    // Username user.username
    ctx.fillText(user.username, 190, 85, 390);
    // Ranking

    const userData = await getWordleDataByUserID(user.id);
    // Fetch ranking
    const ranking = await getRanking();
    // If user in ranking
    let userRanking = 0;
    if (ranking.find( (u: any) => u.userID == user.id )) {
        // Get user's rank
        const userRank = ranking.findIndex( (u: any) => u.userID == user.id ) + 1;
        userRanking = userRank;
    }
    let totalNumRanked = ranking.length;

    // Get highest weighted score
    const topWeightedScore = ranking.reduce(function (a, b) {
        return (a.weightedScore > b.weightedScore ? a : b);
    }).weightedScore;

    ctx.font = '32px sans-serif';
    ctx.fillText(`Ranked #${userRanking} out of ${totalNumRanked}`, 190, 125, 390)

    ctx.fillText(`Weighted Score: ${userData.weightedScore}`, 190, 165, 390);

    // Weighted ranking line
    ctx.beginPath();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.moveTo(25, 200);
    ctx.lineTo(575, 200);
    ctx.stroke();
    ctx.closePath();

    // Draw markers
    ctx.fillText('0', 25, 235);
    ctx.textAlign = 'right';
    ctx.fillText(`${topWeightedScore}`, 575, 235);

    // Draw circle (line length 550)
    ctx.beginPath()
    ctx.strokeStyle = '#ff0000';
    ctx.fillStyle = '#ff0000';
    const radius = 10;
    ctx.arc(userData.weightedScore / topWeightedScore * 550, 200, radius, 0, 2*Math.PI);
    ctx.stroke();
    ctx.fill();
    ctx.closePath();

    // Puzzles Attempted
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    ctx.font = '900 50px sans-serif';
    ctx.fillText(userData.totalPuzzles.toString(), 125, 345, 100);

    ctx.font = '24px sans-serif';
    ctx.fillText("Puzzles", 125, 370, 100);
    ctx.fillText("Attempted", 125, 390, 100);

    // Puzzles Completed
    ctx.font = '900 50px sans-serif';
    ctx.fillText(userData.numComplete.toString(), 300, 345, 100);
    
    ctx.font = '24px sans-serif';
    ctx.fillText("Puzzles", 300, 370, 100);
    ctx.fillText("Completed", 300, 390, 100);

    // Average Guesses
    ctx.font = '900 50px sans-serif';
    ctx.fillText(userData.totalAverage.toFixed(2), 475, 345, 100);
    
    ctx.font = '24px sans-serif';
    ctx.fillText("Guess", 475, 370, 100);
    ctx.fillText("Average", 475, 390, 100);

    return canvas.toBuffer()
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
                    await broadcastCommandStatus(interaction, CommandStatus.DisabledInGuild, {command: wordleStats});
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

            const image = await buildImage(user, interaction);
            await interaction.editReply({
                content: `Here are the Wordle statistics for ${user.username}`,
                files: [{attachment: image, name: 'wordleStats.png'}]
            });
            


        },
        properties: {
            Name: 'Wordle Stats',
            Scope: 'global',
            GuildOnly: true,
            Enabled: true,
            DefaultEnabled: false,
            Intents: [],
            Feature: Feature.Wordle
        }
}