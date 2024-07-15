import { CommandInterface } from '../interfaces/Command.js';
import { SlashCommandBuilder } from "@discordjs/builders";
import { getAvatarURL } from '../utils/userUtils.js';
import { decompressFrames, ParsedFrame, parseGIF } from 'gifuct-js';
import { createCanvas, ImageData, loadImage } from 'canvas';
import path from 'path';
import {GIFEncoder} from "../utils/GIFEncoder/GIFEncoder.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

export const animAvatarTest: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('animavatartest')
        .setDescription("Test animation")
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to get the avatar for')
                .setRequired(true)
        ),
    run: async (interaction) => {
        let user = interaction.options.getUser('user');
        if (!user || !interaction.guild) {
            return;
        }
        const avatar = await getAvatarURL(user, interaction.guild.id);
        const avatarType = avatar[0];
        const avatarURL = avatar[1];

        if (avatarType != "gif") { return; }



        // Gif frame data
        let frameImageData: ImageData;
        let frameIndex: number = 0;
        let loadedFrames: ParsedFrame[];
        let needsDisposal: boolean = false;
        
        

        // Fetch gif and split into array of all GIF image frames and metadata
        loadedFrames = await fetch(avatarURL)
        .then(resp => resp.arrayBuffer())
        .then(buff => {
            var gif = parseGIF(buff);
            var frames = decompressFrames(gif, true);
            return frames;
        });

        // Sample first frame to get dimensions
        const firstFrame = loadedFrames[0];

        const canvasWidth = 360;
        const canvasHeight = 403;
        const gifWidth = firstFrame.dims.width;
        const gifHeight = firstFrame.dims.height;

        // Full gif canvas
        const outputCanvas = createCanvas(canvasWidth, canvasHeight);
        const outputCtx = outputCanvas.getContext('2d');

        // Gif patch canvas
        const gifPatchCanvas = createCanvas(gifWidth, gifHeight);
        const gifPatchCtx = gifPatchCanvas.getContext('2d');

        // Gif encoder
        const encoder = new GIFEncoder(canvasWidth, canvasHeight, "neuquant", true);
        encoder.setThreshold(60);
        encoder.setDelay(firstFrame.delay);
        encoder.start();

        // Load overlay
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const overlay = await loadImage(path.join(__dirname, '..', '..', '..', 'assets', 'img', 'beautiful.png'));

        // Render gif
        renderGif(loadedFrames);

        

        // Draws frame data over canvas
        function drawPatch(frame: ParsedFrame) {
            var dims = frame.dims;
            // Set frame image to size of gif frame
            if ( !frameImageData ||
                dims.width != frameImageData.width ||
                dims.height != frameImageData.height ) {
                    gifPatchCanvas.width = dims.width;
                    gifPatchCanvas.height = dims.height;
                    frameImageData = gifPatchCtx.createImageData(dims.width, dims.height);
            }
            frameImageData.data.set(frame.patch);
            gifPatchCtx.putImageData(frameImageData, 0, 0);
            outputCtx.drawImage(gifPatchCanvas, 237, 25, 100, 100);
            outputCtx.drawImage(gifPatchCanvas, 237, 230, 100, 100);
            
        }

        // Entry point for rendering gif
        function renderGif(frames: ParsedFrame[] ) {
            loadedFrames = frames;
            frameIndex = 0;
            //canvas.width = frames[0].dims.width;
            //canvas.height = frames[0].dims.height;
            outputCanvas.width = canvasWidth;
            outputCanvas.height = canvasHeight;

            
            renderFrame();
        }

        // Recursively called to render each frame
        function renderFrame() {
            let frame = loadedFrames[frameIndex];

            if (needsDisposal) {
                gifPatchCtx.clearRect(0, 0, gifPatchCanvas.width, gifPatchCanvas.height);
                needsDisposal = false;
            }

            // draw patch
            drawPatch(frame);
            // update frame index
            frameIndex++;
            if (frameIndex >= loadedFrames.length) { return }
            // update disposal
            if (frame.disposalType === 2) needsDisposal = true;

            // Add overlay
            outputCtx.drawImage(overlay, 0, 0, canvasWidth, canvasHeight)
            //outputCtx.font = "30px Impact";
            //outputCtx.fillText("I want to", 0, frame.dims.height / 4, frame.dims.width);
            //outputCtx.fillText("die", frame.dims.width / 3, frame.dims.height, frame.dims.width);


            // Add frame to gif
            if (outputCtx == null) {
                throw new Error("Output context is null");
            }
            encoder.addFrame(outputCtx);

            renderFrame();
        }
        
        // Finish writing gif
        encoder.finish();
        const buffer = encoder.out.getData();

        if (interaction.replied || interaction.deferred ) await interaction.editReply({ files: [{attachment: buffer, name: 'test.gif'}]})
        else await interaction.reply({ files: [{attachment: buffer, name: 'test.gif'}]});

    },
    properties: {
        Name: '[TEST] Animated Avatar Test',
        Scope: 'global',
        GuildOnly: false,
        Enabled: false,
        DefaultEnabled: false,
        Intents: []
    }
}