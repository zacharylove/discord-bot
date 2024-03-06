import { CommandInteraction, SlashCommandBuilder, User } from "discord.js";
import { CommandInterface } from "../../../interfaces/Command.js";
import { createCanvas, loadImage } from 'canvas';
import { getAvatarURL } from "../../../utils/userUtils.js";
import { getConnectionsDataByUserID, getRanking } from "../../../database/connectionsData.js";

const buildImage = async (user: User, interaction: CommandInteraction): Promise<Buffer> => {
    // Build 1200x400 canvas
    let canvas = createCanvas(600, 615);
    let ctx = canvas.getContext('2d');

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
    ctx.fillText("Connections Statistics For", 190, 43, 390);
    ctx.font = '900 40px sans-serif';
    // Username user.username
    ctx.fillText(user.username, 190, 85, 390);

    const userData = await getConnectionsDataByUserID(user.id);
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
    ctx.fillStyle = '#ffffff';
    const radius = 10;
    ctx.arc((userData.weightedScore / topWeightedScore * 550) + 25, 200, radius, 0, 2*Math.PI);
    ctx.stroke();
    ctx.fill();
    ctx.closePath();

    // Average guesses
    ctx.beginPath();
    ctx.fillStyle = '#ffffff';
    ctx.roundRect(0, 280, 600, 180, 20);
    ctx.fill();
    ctx.closePath();

    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000000';
    ctx.fillText("Average Guesses by Group", 300, 450);

    let width = 120;
    let spacing = width / 5;
    let y = 300;

    // Group A
    ctx.beginPath()
    ctx.fillStyle = '#f9df6d';
    ctx.roundRect(0*width + 1*spacing, y, width, width, 20);
    ctx.fill();
    ctx.closePath();

    let avgA;
    if (userData.totalAverageGuesses[0]) avgA = Math.round(userData.totalAverageGuesses[0]*100) / 100;
    else avgA = "?";    
    ctx.font = '900 50px sans-serif';
    ctx.fillStyle = 'rgba(0,0,255,0.5)';
    ctx.fillText(`${avgA}`, 1*(width/2) + 1*spacing + 1, y + (width/2) + 15 - 1, width);
    ctx.fillStyle = 'rgba(255,0,0,0.5)';
    ctx.fillText(`${avgA}`, 1*(width/2) + 1*spacing - 1, y + (width/2) + 15 + 1, width);
    ctx.fillStyle = '#000000';
    ctx.fillText(`${avgA}`, 1*(width/2) + 1*spacing, y + (width/2) + 15, width);

    // Group B
    ctx.beginPath()
    ctx.fillStyle = '#a0c35a';
    ctx.roundRect(1*width + 2*spacing, y, width, width, 20);
    ctx.fill();
    ctx.closePath();

    let avgB;
    if (userData.totalAverageGuesses[1]) avgB = Math.round(userData.totalAverageGuesses[1]*100) / 100;
    else avgB = "?";    
    ctx.font = '900 50px sans-serif';
    ctx.fillStyle = 'rgba(0,0,255,0.5)';
    ctx.fillText(`${avgB}`, 3*(width/2) + 2*spacing + 1, y + (width/2) + 15 - 1, width);
    ctx.fillStyle = 'rgba(255,0,0,0.5)';
    ctx.fillText(`${avgB}`, 3*(width/2) + 2*spacing - 1, y + (width/2) + 15 + 1, width);
    ctx.fillStyle = '#000000';
    ctx.fillText(`${avgB}`, 3*(width/2) + 2*spacing, y + (width/2) + 15, width);

    // Group C
    ctx.beginPath()
    ctx.fillStyle = '#b0c4ef';
    ctx.roundRect(2*width + 3*spacing, y, width, width, 20);
    ctx.fill();
    ctx.closePath();

    let avgC;
    if (userData.totalAverageGuesses[2]) avgC = Math.round(userData.totalAverageGuesses[2]*100) / 100;
    else avgC = "?";   
    ctx.font = '900 50px sans-serif';
    ctx.fillStyle = 'rgba(0,0,255,0.5)';
    ctx.fillText(`${avgC}`, 5*(width/2) + 3*spacing + 1, y + (width/2) + 15 - 1, width);
    ctx.fillStyle = 'rgba(255,0,0,0.5)';
    ctx.fillText(`${avgC}`, 5*(width/2) + 3*spacing - 1, y + (width/2) + 15 + 1, width);
    ctx.fillStyle = '#000000';
    ctx.fillText(`${avgC}`, 5*(width/2) + 3*spacing, y + (width/2) + 15, width);

    // Group D
    ctx.beginPath()
    ctx.fillStyle = '#ba81c5';
    ctx.roundRect(3*width + 4*spacing, y, width, width, 20);
    ctx.fill();
    ctx.closePath();

    let avgD;
    if (userData.totalAverageGuesses[3]) avgD = Math.round(userData.totalAverageGuesses[3]*100) / 100;
    else avgD = "?";   
    ctx.font = '900 50px sans-serif';
    ctx.fillStyle = 'rgba(0,0,255,0.5)';
    ctx.fillText(`${avgD}`, 7*(width/2) + 4*spacing + 1, y + (width/2) + 15 - 1, width);
    ctx.fillStyle = 'rgba(255,0,0,0.5)';
    ctx.fillText(`${avgD}`, 7*(width/2) + 4*spacing - 1, y + (width/2) + 15 + 1, width);
    ctx.fillStyle = '#000000';
    ctx.fillText(`${avgD}`, 7*(width/2) + 4*spacing, y + (width/2) + 15, width);
    
    // Streak calendar
    //const canvasInfo = await buildResultCalendar(canvas, ctx, userData, 0, 625);
    //canvas = canvasInfo[0]
    //ctx = canvasInfo[1]

    // Stats

    ctx.fillStyle = '#ffffff';
    ctx.beginPath()
    ctx.roundRect(0*width + 1*spacing, y + width + 3*spacing, width, width, 20);
    ctx.roundRect(1*width + 2*spacing, y + width + 3*spacing, width, width, 20);
    ctx.roundRect(2*width + 3*spacing, y + width + 3*spacing, width, width, 20);
    ctx.roundRect(3*width + 4*spacing, y + width + 3*spacing, width, width, 20);
    ctx.fill();
    ctx.closePath();

    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.font = '900 50px sans-serif';
    let yStat = y + width + 3*spacing + width / 2;
    let yTitleLine = yStat + 25;
    let ySubtitleLine = yTitleLine + 20;
    let textX =  1*(width/2) + 1*spacing;
    let textWidth = width - 20;

    ctx.fillText(userData.totalPuzzles.toString(),textX, yStat, textWidth);
    ctx.font = '24px sans-serif';
    ctx.fillText("Puzzles", textX, yTitleLine, textWidth);
    ctx.fillText("Attempted", textX, ySubtitleLine, textWidth);

    textX += width + spacing;
    ctx.font = '900 50px sans-serif';
    ctx.fillText(userData.numComplete.toString(),textX, yStat, textWidth);
    ctx.font = '24px sans-serif';
    ctx.fillText("Puzzles", textX, yTitleLine, textWidth);
    ctx.fillText("Completed", textX, ySubtitleLine, textWidth);

    textX += width + spacing;
    ctx.font = '900 50px sans-serif';
    ctx.fillText(userData.perfectPuzzles.toString(),textX, yStat, textWidth);
    ctx.font = '24px sans-serif';
    ctx.fillText("Perfect", textX, yTitleLine, textWidth);
    ctx.fillText("Puzzles", textX, ySubtitleLine, textWidth);

    textX += width + spacing;
    let longestStreak = userData.longestStreak ? userData.longestStreak : 0;
    ctx.font = '900 50px sans-serif';
    let howRed = 255/14*longestStreak;
    if (howRed > 255) howRed = 255;
    ctx.fillStyle = `rgba(${Math.round(howRed)},0,0,1)`;
    ctx.fillText(userData.longestStreak.toString(),textX, yStat, textWidth);
    ctx.fillStyle = '#000000';
    ctx.font = '24px sans-serif';
    ctx.fillText("Longest", textX, yTitleLine, textWidth);
    ctx.fillText("Streak", textX, ySubtitleLine, textWidth);

    return canvas.toBuffer();
}


export const connectionsStats: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('connectionsstats')
        .setDescription("Displays Connections statistics for a user")
        .addUserOption((option) => 
            option
                .setName('user')
                .setDescription('The user to display Connections statistics for')    
                .setRequired(false)
        )
    ,
    run: async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
       
        const target = interaction.options.getUser('user');
        let user;
        if (!target) {
            user = interaction.user
        } else {
            user = target;
            if (user.bot) {
                await interaction.editReply("Bots can't play Connections!");
                return;
            }
        }
        const image = await buildImage(user, interaction);
        await interaction.editReply({
            content: `Here are the [Connections](<https://www.nytimes.com/games/connections>) statistics for ${user.username}`,
            files: [{attachment: image, name: 'connectionsStats.png'}]
        });


    },
    properties: {
        Name: 'Connections Stats',
        Scope: 'global',
        GuildOnly: true,
        Enabled: true,
        DefaultEnabled: true,
        Intents: [],
    }
}