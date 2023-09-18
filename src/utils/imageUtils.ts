// Utility functions for images
import axios, { AxiosResponse } from 'axios';
import { Canvas } from 'canvas';
import { ALLOWED_EXTENSIONS, CommandInteraction, ImageExtension, User } from 'discord.js';
import { RequestInterface } from 'interfaces/RequestInterface';
import path from 'path';

// Valid image formats according to Discord
const validFormats : ImageExtension[] = ["webp", "png", "jpg", "jpeg"];

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

