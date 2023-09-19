// Command to add text to GIFs
// TODO: Also make context menu command

import { ActionRowBuilder, ContextMenuCommandBuilder, ModalActionRowComponentBuilder } from "@discordjs/builders";
import { ApplicationCommandType, CommandInteraction, PermissionsBitField, Events, ModalBuilder, TextInputBuilder, TextInputStyle, Embed, EmbedBuilder } from "discord.js";
import { CommandInterface } from "../interfaces/Command";
import { decompressFrames, ParsedFrame, parseGIF } from 'gifuct-js';
import { createCanvas, ImageData, loadImage, registerFont } from 'canvas';
import axios from "axios";



export const caption: CommandInterface = {
    data: new ContextMenuCommandBuilder()
        .setName('Caption Image/GIF')
        .setType(ApplicationCommandType.Message)
        .setDefaultMemberPermissions(PermissionsBitField.Flags.AttachFiles)
    ,
    run: async (interaction: CommandInteraction) => {
        if (!interaction.isMessageContextMenuCommand()) return;
        let imageURL: string = "";
        let isGIF: boolean = false;
        const hasAttachment: boolean = interaction.targetMessage.attachments.first() != null;
        const hasEmbed: boolean = interaction.targetMessage.embeds.length > 0;
        if (hasAttachment) {
            // Get image URL from first attachment
            const attachment = interaction.targetMessage.attachments.first();
            if (!attachment) {
                await interaction.reply({ content: "No attachment found", ephemeral: true });
                return;
            }
            imageURL = attachment.url;
        } else if (hasEmbed) {
            // Get image URL from first embed
            const embed = interaction.targetMessage.embeds[0];
            // Obtain image URL from embed
            if (!embed.image) {
                // If no image, try to find video and convert to gif
                if (!embed.video) {
                    await interaction.reply({ content: "No image found", ephemeral: true });
                    return;
                }
                
                imageURL = embed.video.url;
                // For tenor gifs
                if ( imageURL.includes("tenor.com") ) {
                    imageURL = imageURL.replace("AAAPo", "AAAAC");
                }
                imageURL = imageURL.replace(".mp4", ".gif");
            } else {
                imageURL = embed.image.url;
            }
        } else {
            const message = interaction.targetMessage.content;
            // Parse image URL from message
            const imageRegex = new RegExp(`\\bhttps?:\\/\\/\\S+`);
            const match = message.match(imageRegex);
            if (!match) {
                await interaction.reply({ content: "No image found", ephemeral: true });
                return;
            }
            imageURL = match[0];
        }

        if (imageURL.includes(".gif")) isGIF = true;

        // Build caption creation modal
        const modal = new ModalBuilder()
            .setCustomId('captionModal')
            .setTitle("Add Caption");

        // Top text
        const topText = new TextInputBuilder()
			.setCustomId('topText')
		    // The label is the prompt the user sees for this input
			.setLabel("Enter top text")
		    // Short means only a single line of text
			.setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(50);
        const topTextRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
            .addComponents(topText);

        // bottom text
        const bottomText = new TextInputBuilder()
			.setCustomId('bottomText')
		    // The label is the prompt the user sees for this input
			.setLabel("Enter bottom text")
		    // Short means only a single line of text
			.setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(50);
        const bottomTextRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
            .addComponents(bottomText);

        // Add inputs to the modal
		modal.addComponents(topTextRow, bottomTextRow);
        await interaction.showModal(modal);
        await interaction.awaitModalSubmit({
            // Timeout after a minute of not receiving any valid Modals
            time: 60000,
            // Make sure we only accept Modals from the User who sent the original Interaction we're responding to
            filter: i => {
                i.deferUpdate();
                return i.user.id === interaction.user.id
            },
        }).then(async submitted => {
            const topText = submitted.fields.getTextInputValue('topText').toUpperCase();
            const bottomText = submitted.fields.getTextInputValue('bottomText').toUpperCase();
            if (topText == "" && bottomText == "") return;
            // Must be alphanumeric
            if ( !topText.match(/^[a-z0-9 ]+$/i) || !bottomText.match(/^[a-z0-9 ]+$/i) ) {
                await submitted.followUp({ content: "Text must be alphanumeric", ephemeral: true });
                return;
            }

            // Output buffer
            let buffer;
            // Register impact font
            registerFont(require("@canvas-fonts/impact"), { family: "Impact" });
            // Set filetype
            let filetype: string;


            // Edit the GIF
            if (isGIF) {
                filetype = "gif";
                // Gif frame data
                let frameImageData: ImageData;
                let frameIndex: number = 0;
                let loadedFrames: ParsedFrame[];
                let needsDisposal: boolean = false;
                
                // Encoder to build output gif
                const GIFencoder = require('gif-encoder-2');

                // Fetch gif and split into array of all GIF image frames and metadata
                loadedFrames = await fetch(imageURL)
                .then(resp => resp.arrayBuffer())
                .then(buff => {
                    var gif = parseGIF(buff);
                    var frames = decompressFrames(gif, true);
                    return frames;
                });

                // Sample first frame to get dimensions
                const firstFrame = loadedFrames[0];

                const canvasWidth = firstFrame.dims.width;
                const canvasHeight = firstFrame.dims.height;
                const gifWidth = firstFrame.dims.width;
                const gifHeight = firstFrame.dims.height;

                // Full gif canvas
                const outputCanvas = createCanvas(canvasWidth, canvasHeight);
                const outputCtx = outputCanvas.getContext('2d');

                // Gif patch canvas
                const gifPatchCanvas = createCanvas(gifWidth, gifHeight);
                const gifPatchCtx = gifPatchCanvas.getContext('2d');

                // Gif encoder
                const encoder = new GIFencoder(canvasWidth, canvasHeight, "octree", true);
                encoder.setThreshold(60);
                encoder.setDelay(firstFrame.delay);
                encoder.start();

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
                    outputCtx.drawImage(gifPatchCanvas, 0, 0, dims.width, dims.height);
                    
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
                    const fontSize = frame.dims.height > 250 ? frame.dims.height * 0.15 : frame.dims.height * 0.2;
                    outputCtx.font = `bold ${fontSize}px Impact`;
                    outputCtx.fillStyle = "#ffffff";
                    outputCtx.lineWidth = 2;
                    outputCtx.strokeStyle = "#000000";
                    outputCtx.textAlign = "center";
                    outputCtx.fillText(topText, frame.dims.width / 2, fontSize, frame.dims.width);
                    outputCtx.strokeText(topText, frame.dims.width / 2, fontSize, frame.dims.width);
                    outputCtx.fillText(bottomText, frame.dims.width / 2, frame.dims.height - (fontSize/2), frame.dims.width);
                    outputCtx.strokeText(bottomText, frame.dims.width / 2, frame.dims.height - (fontSize/2), frame.dims.width);


                    // Add frame to gif
                    if (outputCtx == null) {
                        throw new Error("Output context is null");
                    }
                    encoder.addFrame(outputCtx);

                    renderFrame();
                }

                // Finish writing gif
                encoder.finish();
                buffer = encoder.out.getData();
            } 
            // Edit the static image
            else {
                filetype = "png";
                let width: number = 0;
                let height: number = 0;
                const img = await loadImage(imageURL);
                width = img.width;
                height = img.height;


                const outputCanvas = createCanvas(width, height);
                const outputCtx = outputCanvas.getContext('2d');
                outputCtx.drawImage(img, 0, 0, width, height);

                const fontSize = height > 250 ? height * 0.15 : height * 0.2;
                outputCtx.font = `bold ${fontSize}px Impact`;
                outputCtx.fillStyle = "#ffffff";
                outputCtx.lineWidth = 2;
                outputCtx.strokeStyle = "#000000";
                outputCtx.textAlign = "center";
                outputCtx.fillText(topText, width / 2, fontSize, width);
                outputCtx.strokeText(topText, width / 2, fontSize, width);
                outputCtx.fillText(bottomText, width / 2, height - (fontSize/2), width);
                outputCtx.strokeText(bottomText, width / 2, height- (fontSize/2), width);


                buffer = outputCanvas.toBuffer();
            }

            try {
                await submitted.followUp({ files: [{attachment: buffer, name: `output.${filetype}`}]});
            } catch (error) {
                
                console.error(error);
            }
        }).catch(error => {
            return null
        });
        return;

    },
    properties: {
        Name: 'Caption',
        Scope: 'global',
        GuildOnly: false,
        Enabled: true,
        DefaultEnabled: true,
        Intents: [],
        Defer: false,
    }

}