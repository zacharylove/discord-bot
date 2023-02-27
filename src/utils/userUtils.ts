// Utility functions that involve users

import { ImageExtension, User } from "discord.js";
import { getAllImagesFromUser } from "./imageUtils";
import { getServerAvatarURLs } from "./requestUtils"


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

