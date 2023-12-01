// Command to add text to GIFs

import { ActionRowBuilder, ContextMenuCommandBuilder, ModalActionRowComponentBuilder } from "@discordjs/builders";
import { ApplicationCommandType, CommandInteraction, PermissionsBitField, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { CommandInterface } from "../../interfaces/Command.js";
import { decompressFrames, ParsedFrame, parseGIF } from 'gifuct-js';
import { createCanvas, ImageData, loadImage, registerFont } from 'canvas';
import { renderFrame } from "../../utils/imageUtils.js";
import {GIFEncoder} from "../../utils/GIFEncoder/GIFEncoder.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

let topText: string = "";
let bottomText: string = "";
let filetype: string;

const addTextCaption = (outputCtx?: any, width?: number, height?: number) => {
    if (!outputCtx || !width || !height) return;
    const fontSize = height > 250 ? height * 0.15 :  height * 0.2;
    // Register impact font
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    registerFont(path.join(__dirname, '..', '..', '..', 'assets', 'font', 'Impact.ttf'), { family: "Impact" });
    outputCtx.font = `bold ${fontSize}px Impact`;
    outputCtx.fillStyle = "#ffffff";
    outputCtx.lineWidth = 2;
    outputCtx.strokeStyle = "#000000";
    outputCtx.textAlign = "center";
    outputCtx.fillText(topText, width / 2, fontSize, width);
    outputCtx.strokeText(topText, width / 2, fontSize, width);
    outputCtx.fillText(bottomText, width / 2, height - (fontSize/2), width);
    outputCtx.strokeText(bottomText, width / 2, height - (fontSize/2), width);
}

const editGIF = async (imageURL: string, overlayFn: () => void): Promise<Buffer> => {
    filetype = "gif";
    // Gif frame data
    let frameImageData: ImageData;
    let frameIndex: number = 0;
    let loadedFrames: ParsedFrame[];
    let needsDisposal: boolean = false;


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
    const encoder = new GIFEncoder(canvasWidth, canvasHeight, "octree", true);
    encoder.setThreshold(60);
    encoder.setDelay(firstFrame.delay);
    encoder.start();

    // Render gif
    renderGif(loadedFrames, overlayFn);

    // Entry point for rendering gif
    function renderGif(frames: ParsedFrame[], overlayFn: () => void ) {
        loadedFrames = frames;
        frameIndex = 0;
        outputCanvas.width = canvasWidth;
        outputCanvas.height = canvasHeight;
        renderFrame( loadedFrames, frameIndex, needsDisposal, gifPatchCtx, gifPatchCanvas, frameImageData, outputCtx, encoder, overlayFn );
    }

    // Finish writing gif
    encoder.finish();
    return encoder.out.getData();
}

const editImage = async (imageURL: string, overlayFn: (...args: any[]) => void ): Promise<Buffer> => {
    filetype = "png";
    let width: number = 0;
    let height: number = 0;
    const img = await loadImage(imageURL);
    width = img.width;
    height = img.height;


    const outputCanvas = createCanvas(width, height);
    const outputCtx = outputCanvas.getContext('2d');
    outputCtx.drawImage(img, 0, 0, width, height);

    overlayFn(outputCtx, width, height);

    return outputCanvas.toBuffer();
}




const buildModal = async (): Promise<ModalBuilder> => {
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
        .setMaxLength(50)
        .setPlaceholder('Alphanumeric text only, 50 character limit.');;
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
        .setMaxLength(50)
        .setPlaceholder('Alphanumeric text only, 50 character limit.');
    const bottomTextRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
        .addComponents(bottomText);

    // Add inputs to the modal
    modal.addComponents(topTextRow, bottomTextRow);
    return modal;
}

const parseImageURL = async (interaction: CommandInteraction): Promise<string> => {
    if (!interaction.isMessageContextMenuCommand()) return "";
    if (!interaction || !interaction.targetMessage) return "";
    let imageURL: string = "";
    const hasAttachment: boolean = interaction.targetMessage.attachments.first() != null;
    const hasEmbed: boolean = interaction.targetMessage.embeds.length > 0;
    if (hasAttachment) {
        // Get image URL from first attachment
        const attachment = interaction.targetMessage.attachments.first();
        if (!attachment) return "";
        imageURL = attachment.url;
    } else if (hasEmbed) {
        // Get image URL from first embed
        const embed = interaction.targetMessage.embeds[0];
        // Obtain image URL from embed
        if (!embed.image) {
            // If no image, try to find video and convert to gif
            if (!embed.video) return "";
            
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
        if (!match) return "";
        imageURL = match[0];
    }

    return imageURL;
}


export const caption: CommandInterface = {
    data: new ContextMenuCommandBuilder()
        .setName('Caption Image/GIF')
        .setType(ApplicationCommandType.Message)
        .setDefaultMemberPermissions(PermissionsBitField.Flags.EmbedLinks)
    ,
    run: async (interaction: CommandInteraction) => {
        if (!interaction.isMessageContextMenuCommand()) return;
        let imageURL: string = await parseImageURL(interaction);
        let isGIF: boolean = false;
        if (imageURL.includes(".gif")) isGIF = true;
        if ( imageURL == "" ) {
            await interaction.reply({ content: "No image found", ephemeral: true });
            return;
        }
        await interaction.showModal(await buildModal());

        await interaction.awaitModalSubmit({
            // Timeout after a minute of not receiving any valid Modals
            time: 60000,
            // Make sure we only accept Modals from the User who sent the original Interaction we're responding to
            filter: i => {
                // All interactions must be deferred, even ones that do not match filter
                i.deferUpdate();
                return i.user.id === interaction.user.id
            },
        }).then(async submitted => {
            topText = submitted.fields.getTextInputValue('topText').toUpperCase();
            bottomText = submitted.fields.getTextInputValue('bottomText').toUpperCase();
            if (topText == "" && bottomText == "") return;
            // Must be alphanumeric
            if ( !topText.match(/^[a-z0-9 ]+$/i) || !bottomText.match(/^[a-z0-9 ]+$/i) ) {
                await interaction.followUp({ content: "Text must be alphanumeric- no symbols or emojis!", ephemeral: true });
                return;
            }
            // Output buffer
            let buffer;
            // Edit GIF or static image
            // Using addTextCaption as the overlay function
            buffer = isGIF ? await editGIF(imageURL, addTextCaption) : await editImage(imageURL, addTextCaption);

            try {
                await interaction.followUp({ files: [{attachment: buffer, name: `output.${filetype}`}]});
            } catch (error) {
                console.error(error);
            }
        }).catch(error => {
            console.error(error);
            interaction.followUp({ content: "An error occurred while processing your request.", ephemeral: true });
            return;
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