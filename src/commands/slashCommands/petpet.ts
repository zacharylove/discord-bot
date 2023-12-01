// Based on https://github.com/aDu/pet-pet-gif
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { CommandInteraction, SlashCommandBuilder } from "discord.js";
import { CommandInterface } from "../../interfaces/Command.js";
import { broadcastCommandFailed } from "../../utils/commandUtils.js";
import { createCanvas, loadImage } from "canvas";
import path from 'path';
import { getAvatarURL } from "../../utils/userUtils.js";
import {GIFEncoder} from "../../utils/GIFEncoder/GIFEncoder.js";


const gifOptions = {
    resolution: 128,
    delay: 20,
    backgroundColor: null,
    frames: 10
}

const createPetPetGif = async (targetURL: string, handedness: string) => {
        
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    
    // Encoder to build output gif




    const encoder = new GIFEncoder(gifOptions.resolution, gifOptions.resolution);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(gifOptions.delay);
    if (!gifOptions.backgroundColor)encoder.setTransparent(1);

    const canvas = createCanvas(gifOptions.resolution, gifOptions.resolution);
    const ctx = canvas.getContext('2d');

    const avatar = await loadImage(targetURL);
    
    let petGifCache = [];
    for (let i = 0; i < gifOptions.frames; i++ ) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        if (gifOptions.backgroundColor) {
            ctx.fillStyle = gifOptions.backgroundColor
            ctx.fillRect(0, 0, canvas.width, canvas.height)
        }

        const j = i < gifOptions.frames / 2 ? i : gifOptions.frames - i

        const width = 0.8 + j * 0.02
        const height = 0.8 - j * 0.05
        const offsetX = (1 - width) * 0.5 + 0.1
        const offsetY = (1 - height) - 0.08

        if (i == petGifCache.length) petGifCache.push(await loadImage(path.resolve(path.join(__dirname, '..', '..', '..', 'assets', 'img', 'petpet', `pet${i}.gif`))));
        const righthanded: boolean = handedness == 'right';
        ctx.drawImage(avatar, righthanded ? 0 : gifOptions.resolution * offsetX, gifOptions.resolution * offsetY, gifOptions.resolution * width, gifOptions.resolution * height)
        ctx.scale(righthanded ? -1 : 1, 1);
        ctx.drawImage(petGifCache[i], righthanded ? petGifCache[i].width * -1 : 0, 0, gifOptions.resolution, gifOptions.resolution)
        ctx.restore();

        encoder.addFrame(ctx)
    }
    encoder.finish();
    return encoder.out.getData();
}


export const petPet: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('petpet')
        .setDescription("Create a gif of a hand petting a user's avatar or an image URL")
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to get the avatar for')
        )
        .addStringOption((option) =>
            option
                .setName('url')
                .setDescription('Image URL')
        )
        .addStringOption((option) =>
            option
                .setName('orientation')
                .setDescription('Right or left handed? (default: left)')
                .addChoices(
                    { name: 'Left-handed', value: 'left' },
                    { name: 'Right-handed', value: 'right' }
                )
                    
        ),
    run: async (interaction: CommandInteraction) => {
        if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.guild || !interaction.channel) {
            await broadcastCommandFailed(interaction, "Interaction is NOT poggers!");
            return;
        }

        let targetURL: string | null;

        const targetUser = await interaction.options.getUser('user')?.fetch(true)
        if (targetUser) {
            const avatar = await getAvatarURL(targetUser, interaction.guild.id, true);
            targetURL = avatar[1];
        } else {
            targetURL = await interaction.options.getString('url');
        }

        if (targetURL == null) {
            interaction.editReply('Please provide either a user or an image URL');
            return;
        }

        const handedness = await interaction.options.getString('orientation') || 'left';
        const buffer = await createPetPetGif(targetURL, handedness);


        await interaction.editReply({ files: [{attachment: buffer, name: 'test.gif'}]});
        

    },
    properties: {
        Name: 'Petpet',
        Scope: 'global',
        GuildOnly: false,
        Enabled: true,
        DefaultEnabled: true,
        Intents: []
    }
}
