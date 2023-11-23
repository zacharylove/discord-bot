// Utility functions for images
import { Canvas } from 'canvas';
import { ImageExtension, User } from 'discord.js';
import { ParsedFrame } from 'gifuct-js';
import path from 'path';
import { fileURLToPath } from 'url';

// Valid image formats according to Discord
const validFormats : ImageExtension[] = ["webp", "png", "jpg", "jpeg"];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const imagePath = path.join(__dirname, '..', '..', 'assets', 'img');

/**
 * Forms a map containing all valid image urls
 * @param imageName Image file name
 * @param imageURL URL of image without extension
 * @returns 
 */
export const getAllImagesFromURL = (imageName: string, imageURL: string): Map<ImageExtension, string> => {
    let imageURLS = new Map<ImageExtension, string>();
    let imageFormats = [...validFormats];
    if (imageName.startsWith('a_')) imageFormats.push("gif");

    for ( const format of imageFormats ) {
        imageURLS.set(format, imageURL + "." + format);
    }
    return imageURLS;
}

export const getAllImagesFromUser = (user: User, type: "avatar" | "banner"): Map<ImageExtension, string> => {
    if (!user || !user.avatar) return new Map<ImageExtension, string>();
    let imageURLS = new Map<ImageExtension, string>();
    let imageFormats = [...validFormats];
    if (user.avatar.startsWith('a_')) imageFormats.push("gif");
    
    let url;
    for ( const format of imageFormats ) {
        if (type === "avatar") url = user.displayAvatarURL({ extension: format });
        else if (type === "banner") {
            url = user.bannerURL({ extension: format });
            //console.debug(`Banner URL: ${url}`);
        }

        if (typeof url === "string") imageURLS.set(format, url);
    }
    return imageURLS;

}

// ========================
// Canvas Rendering Functions
// ========================

/**
 * Draws frame data onto the canvas
 * NOTE: Because the types have optional fields associated with them, they don't play nice with typing and must be defined as any type
 * @date 9/21/2023 - 11:28:20 AM
 *
 * @type {*}
 * @argument frame - (ParsedFrame) Frame to get dimensions from
 * @argument frameImageData - (ImageData) Frame to patch onto output
 * @argument gifPatchCtx - CanvasRenderingContext2D Context for the gif patch canvas
 * @argument outputCtx - (CanvasRenderingContext2D) Final output
 * @argument gifPatchCanvas - (Canvas) Canvas to draw onto the output
 */
export const drawFramePatch = ( frame: any, frameImageData: any, gifPatchCtx: any, outputCtx: any, gifPatchCanvas: Canvas ): void => {
    
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

/**
 * Recursively called to render each GIF frame and apply an overlay function to every frame
 * @param loadedFrames 
 * @param frameIndex 
 * @param needsDisposal 
 * @param gifPatchCtx 
 * @param gifPatchCanvas 
 * @param frameImageData 
 * @param outputCtx 
 * @param encoder 
 * @param overlayFn 
 * @returns 
 */
export const renderFrame = ( loadedFrames: ParsedFrame[], frameIndex: number, needsDisposal: boolean, 
    gifPatchCtx: any, gifPatchCanvas: any, frameImageData: any, outputCtx: any, encoder: any, overlayFn: (...args: any[]) => void ): void => {
    let frame = loadedFrames[frameIndex];

    if (needsDisposal) {
        gifPatchCtx.clearRect(0, 0, gifPatchCanvas.width, gifPatchCanvas.height);
        needsDisposal = false;
    }

    // draw patch
    drawFramePatch(frame, frameImageData, gifPatchCtx, outputCtx, gifPatchCanvas);
    // update frame index
    frameIndex++;
    if (frameIndex >= loadedFrames.length) { return }
    // update disposal
    if (frame.disposalType === 2) needsDisposal = true;

    // Add overlay
    overlayFn(outputCtx, frame.dims.width, frame.dims.height);

    // Add frame to gif
    if (outputCtx == null) {
        throw new Error("Output context is null");
    }
    encoder.addFrame(outputCtx);

    renderFrame( loadedFrames, frameIndex, needsDisposal, gifPatchCtx, gifPatchCanvas, frameImageData, outputCtx, encoder, overlayFn );
}