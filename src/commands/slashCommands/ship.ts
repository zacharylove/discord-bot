import { CommandInterface } from '../../interfaces/Command.js';
import { SlashCommandBuilder } from "@discordjs/builders";
import { User } from 'discord.js';
import { createCanvas, loadImage } from 'canvas';
import { getAvatarURL } from '../../utils/userUtils.js';
import { imagePath } from '../../utils/imageUtils.js';
import { createHash } from 'crypto';
// @ts-ignore
import { default as config } from "../../config/config.json" assert { type: "json" };



  

/**
 * Generates a number based on the given users' IDs and the current timestamp
 * Meant to be consistent in the short-term, but change as time passes
 * @param user1 
 * @param user2 
 * @returns A number between 0 and 100
 */
const generateMatchNumber = async (user1: User, user2: User): Promise<number> => {
    // Generate a string of the two sorted user IDs, separated by the first 5 digits of the current timestamp
    // Sorted so it doesn't matter who calls the ship command
    const timestamp = new Date().getDay();
    const data = [user1.id, user2.id].sort().join(String(timestamp));
    const hash = createHash('sha256').update(data).digest('hex');
    const num = parseInt(hash, 16);

    // ensure result is between 1 and 70
    const scaledNum = ((num % 70) + 70) % 70 + 1; 

    // Get secondary number
    const hour = new Date(timestamp).getHours();
    const secondaryNum = String(hour) + String(timestamp);
    const secondaryHash = createHash('sha256').update(secondaryNum).digest('hex');
    const numSecondary = parseInt(secondaryHash, 16);

    // ensure result is between 1 and 30
    const scaledNumSecondary = ((numSecondary % 30) + 30) % 30 + 1; 

    
    return scaledNum + scaledNumSecondary;
   
}

export const ship: CommandInterface = {
    data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription("Tells you how compatible two users are")
    .addUserOption((option) =>
        option
            .setName('user1')
            .setDescription('User to ship with')
            .setRequired(true)
    )
    .addUserOption((option) =>
        option
            .setName('user2')
            .setDescription('User to ship with')
            .setRequired(false)
    ),
    run: async (interaction) => {
        // If only one user is specified, assume the other is the calling user
        let user2 = interaction.options.getUser('user2');
        if (!user2) user2 = interaction.user;
        const user1 = interaction.options.getUser('user1');
        if (!user1) {
            console.warn("No user1 specified");
            return;
        }

        let shipNum;
        let message;
        if (user1.id == user2.id) {
            shipNum = 150;
            message = "You should always love yourself :)";
        } else if (user1.bot || user2.bot) {
            shipNum = 0;
            message = "Bots aren't capable of love! (...yet)";
        } else {
            shipNum = await generateMatchNumber(user1, user2);

            let messageList: string[];
            const shipMessages = config.roleplay.shipMessages;

            // Really bad
            if (shipNum < 10) messageList = shipMessages.reallybad;
            // Bad
            else if (shipNum < 25) messageList = shipMessages.bad;
            // Kind of bad
            else if (shipNum < 40) messageList = shipMessages.kindofbad;
            // Okay
            else if (shipNum < 60) messageList = shipMessages.okay;
            // Good
            else if (shipNum < 85) messageList = shipMessages.good;
            //Great
            else if (shipNum < 95) messageList = shipMessages.great;
            // Really great
            else if (shipNum <= 100) messageList = shipMessages.reallygreat;
            else messageList = shipMessages.okay;

            // Randomly select message
            message = messageList[Math.floor(Math.random() * messageList.length)];
        }

        const canvas = createCanvas(750, 300);
        const ctx = canvas.getContext('2d');

        // Load avatars, prioritizing server avatars
        let avatar1, avatar2;

        if (interaction.guild) {
            avatar1 = await getAvatarURL(user1, interaction.guild.id);
            avatar2 = await getAvatarURL(user2, interaction.guild.id);
        } else {
            avatar1 = await getAvatarURL(user1);
            avatar2 = await getAvatarURL(user2);
        }

        const avatar1Type = avatar1[0];
        const avatar2Type = avatar2[0];
        avatar1 = avatar1[1];
        avatar2 = avatar2[1];        

        // Load and draw avatars onto canvas
        const loadedAvatar1 = await loadImage(avatar1);
        const loadedAvatar2 = await loadImage(avatar2);
        ctx.drawImage(loadedAvatar1, 20, 20, 300, 300);
        ctx.drawImage(loadedAvatar2, 420, 20, 300, 300);

        // Load heart
        const heart = await loadImage(imagePath + '/ship-heart.png');
        // Change opacity of heart based on ship num
        const heartOpacity = shipNum / 100;
        // Lower limit is 0.4 to prevent heart from being too transparent
        if (heartOpacity <= 0.4) { heartOpacity == 0.4;}
        ctx.globalAlpha = heartOpacity;
        ctx.drawImage(heart, 270, 80, 200, 200);
        ctx.globalAlpha = 1;

        // If match > 75%, add overlay
        if (shipNum >= 75) {
            const overlay = await loadImage(imagePath + '/ship-overlay.png');
            ctx.drawImage(overlay, 0, 0, 320, 110);
			ctx.drawImage(overlay, 420, 0, 320, 110);
        }
        
        // Draw percentage
        ctx.font = 'bold 60px sans-serif';
		ctx.textAlign = "center"; 
		ctx.fillStyle = '#ffffff';
		ctx.fillText(shipNum + '%', canvas.width / 2, 180);

        // Display
        await interaction.editReply(
            {
                content: message,
                files: [{attachment: canvas.toBuffer(), name: 'ship.png'}]
            }
        );
        return;
    },
    properties: {
        Name: 'Ship',
        Scope: 'global',
        GuildOnly: true,
        Enabled: true,
        DefaultEnabled: true,
        Intents: []
    }
 
}