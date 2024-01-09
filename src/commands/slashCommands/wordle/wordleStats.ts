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
    const canvas = createCanvas(600, 600);
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = "#ffffff";
    ctx.roundRect(0, 0, 600, 260, 20);
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
    ctx.fillText('0', 25, 240);
    ctx.textAlign = 'right';
    ctx.fillText(`${topWeightedScore}`, 575, 240);

    // Draw circle (line length 550)
    ctx.beginPath()
    ctx.strokeStyle = '#ff0000';
    ctx.fillStyle = '#ff0000';
    const radius = 10;
    ctx.arc((userData.weightedScore / topWeightedScore * 550) + 25, 200, radius, 0, 2*Math.PI);
    ctx.stroke();
    ctx.fill();
    ctx.closePath();

    let xPos;
    let yStat = 335;
    let yTitleLine = 360;
    let ySubtitleLine = 380;
    const cardHeight = 120;

    const width = 120;
    let textWidth = width - 20;
    const spacing = width/5;
    xPos = width/2 + spacing;

    ctx.fillStyle = '#ffffff';
    ctx.roundRect(xPos - width/2, 280, width, cardHeight, 20);
    ctx.roundRect(xPos + width + spacing - width/2, 280, width, cardHeight, 20);
    ctx.roundRect(xPos + 2*(width + spacing) - width/2, 280, width, cardHeight, 20);
    ctx.roundRect(xPos + 3*(width + spacing) - width/2, 280, width, cardHeight, 20);
    // Hardest Word
    ctx.roundRect(xPos - width/2, 280+cardHeight+spacing, width*2+spacing, cardHeight, 20);
    ctx.roundRect(xPos + 2*(width+spacing) - width/2, 280+cardHeight+spacing, width*2+spacing, cardHeight, 20);
    ctx.fill()
    

    // Puzzles Attempted
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    let howRed,howBlue;


    ctx.font = '900 50px sans-serif';
    ctx.fillText(userData.totalPuzzles.toString(), xPos, yStat, textWidth);

    ctx.font = '24px sans-serif';
    ctx.fillText("Puzzles", xPos, yTitleLine, textWidth);
    ctx.fillText("Attempted", xPos, ySubtitleLine, textWidth);

    // Puzzles Completed
    xPos += width + spacing;
    ctx.font = '900 50px sans-serif';
    ctx.fillText(userData.numComplete.toString(), xPos, yStat, textWidth);
    ctx.font = '24px sans-serif';
    ctx.fillText("Puzzles", xPos, yTitleLine, textWidth);
    ctx.fillText("Completed", xPos, ySubtitleLine, textWidth);

    // Average Guesses
    xPos += width + spacing;
    // Gets bluer the closer to 2 you are, redder the closer to 5 you are
    const intAvg = Math.round(userData.totalAverage);
    howRed = (intAvg-2) * (255/4);
    howRed = howRed > 255 ? 255 : howRed;
    howBlue = (6-intAvg) * (255/4);
    howBlue = howBlue > 255 ? 255 : howBlue;
    // No way someone averages below 1 guess

    ctx.fillStyle = `rgba(${Math.round(howRed)},0,${Math.round(howBlue)},1)`;
    ctx.font = '900 50px sans-serif';
    ctx.fillText(userData.totalAverage.toFixed(2), xPos, yStat, textWidth);
    ctx.fillStyle = '#000000';
    ctx.font = '24px sans-serif';
    ctx.fillText("Guess", xPos, yTitleLine, textWidth);
    ctx.fillText("Average", xPos, ySubtitleLine, textWidth);

    // Longest Streak
    xPos += width + spacing;
    let longestStreak = userData.longestStreak ? userData.longestStreak : 0;
    // Do a quick sanity check for longest streak
    if (userData.wordleStreak > longestStreak) longestStreak = userData.wordleStreak;
    // Gets redder the closer to 14 days you are
    howRed = 255/14*longestStreak;
    if (howRed > 255) howRed = 255;
    ctx.fillStyle = `rgba(${Math.round(howRed)},0,0,1)`;
    ctx.font = '900 50px sans-serif';
    ctx.fillText(longestStreak.toString(), xPos, yStat, textWidth);
    
    ctx.fillStyle = '#000000';
    ctx.font = '24px sans-serif';
    ctx.fillText("Longest", xPos, yTitleLine, textWidth);
    ctx.fillText("Streak", xPos, ySubtitleLine, textWidth);

    // Begin row 2
    xPos = (2*width+spacing)/2 + spacing;
    yStat += cardHeight + spacing;
    yTitleLine += cardHeight + spacing;
    ySubtitleLine += cardHeight + spacing;
    // Double card width
    textWidth *= 2;
    textWidth += 20;

    // Hardest Word
    let avg: number;
    let lowestAvg = 7;
    let highestAvg = 0;
    let hardestId = 9999;
    let easiestId = 9999;
    let hardestAttempts = 0;
    let easiestAttempts = 9999;
    for (const result of userData.results) {
        avg = 0;
        result.scores.forEach( score => {
            avg += score;
        });
        avg /= result.scores.length;
        // If tie, take the higher number of attempts
        if ((avg < lowestAvg) || (avg == lowestAvg && result.scores.length > easiestAttempts )) {
            lowestAvg = avg;
            easiestId = result.puzzleID;
            easiestAttempts = result.scores.length;
        } 
        if ((avg > highestAvg) || (avg == highestAvg && result.scores.length > hardestAttempts )) {
            highestAvg = avg;
            hardestId = result.puzzleID;
            hardestAttempts = result.scores.length;
        }
    }
    ctx.font = '900 50px sans-serif';
    ctx.fillText(`#${hardestId}`, xPos, yStat, textWidth);
    ctx.font = '24px sans-serif';
    ctx.fillText("Hardest Puzzle", xPos, yTitleLine, textWidth);
    ctx.font = '18px sans-serif';
    ctx.fillText(`${highestAvg} avg guesses over ${hardestAttempts} attempts`, xPos, ySubtitleLine, textWidth);

    // Easiest Word
    xPos += (2*width+spacing) + spacing;
    ctx.font = '900 50px sans-serif';
    ctx.fillText(`#${easiestId}`, xPos, yStat, textWidth);
    ctx.font = '24px sans-serif';
    ctx.fillText("Easiest Puzzle", xPos, yTitleLine, textWidth);
    ctx.font = '18px sans-serif';
    ctx.fillText(`${lowestAvg} avg guesses over ${easiestAttempts} attempts`, xPos, ySubtitleLine, textWidth);


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