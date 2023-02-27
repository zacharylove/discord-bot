// Utility functions that involve users

import { ImageExtension, User } from "discord.js";
import { getAllImagesFromUser } from "./imageUtils";
import { getServerAvatarURLs, hasServerAvatar } from "./requestUtils"


/* -----------------------------
 * Avatar functions
 * Unlike the built-in displayAvatarURL() function, these functions return all possible image formats
  ----------------------------- */

export const getServerProfileAvatar = async (target: User, guildId: string): Promise<Map<ImageExtension, string>> => {
    return await getServerAvatarURLs(guildId, target.id);
}

export const getGlobalAvatar = (target: User): Map<ImageExtension, string> => {
    return getAllImagesFromUser(target, "avatar");
}

export const getGlobalBanner = (target: User): Map<ImageExtension, string> => {
    return getAllImagesFromUser(target, "banner");
}

// Loads avater, prioritizing server avatar and gif format
export const getAvatarURL = async (target: User, guildId?: string): Promise<[string, string]> => {
    let avatar;
    if (guildId) {
        if (await hasServerAvatar(target.id, guildId)) {
            avatar = await getServerProfileAvatar(target, guildId);
        } else {
            console.debug(`Requested server avatar for user ${target.id} in guild ${guildId} but no server avatar was found`);
        }
    }
    if (!avatar) avatar = getGlobalAvatar(target);

    if (avatar.has("gif")) return ["gif", avatar.get("gif") as string];
    else if (avatar.has("png")) return ["png", avatar.get("png") as string];
    else if (avatar.has("jpg")) ["jpg", avatar.get("jpg") as string];
    else if (avatar.has("webp")) ["webp", avatar.get("webp") as string];
    else {
        console.warn(`No avatar found for user ${target.id} in guild ${guildId}!`)
    }
    return ["", target.displayAvatarURL()];
}

