// Utility functions that involve users

import { Guild, ImageExtension, PermissionsBitField, User } from "discord.js";
import { getAllImagesFromUser } from "./imageUtils.js";
import { getServerAvatarURLs, hasServerAvatar } from "../api/discordAPI.js"


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

/**
 * Gets an avatar URL for a user.
 * Prioritizes server avatar over global avatar.
 * Formats are prioritized in the following order: gif, png, jpg, webp
 * @param target 
 * @param guildId 
 * @returns avatar image URL
 */
export const getAvatarURL = async (target: User, guildId?: string, staticImg?: boolean): Promise<[string, string]> => {
    let avatar;
    if (guildId) {
        if (await hasServerAvatar(target.id, guildId)) {
            avatar = await getServerProfileAvatar(target, guildId);
        } else {
            console.debug(`Requested server avatar for user ${target.id} in guild ${guildId} but no server avatar was found`);
        }
    }
    if (!avatar) avatar = getGlobalAvatar(target);

    if (avatar.has("gif") && (staticImg == null || !staticImg)) return ["gif", avatar.get("gif") as string];
    else if (avatar.has("png")) return ["png", avatar.get("png") as string];
    else if (avatar.has("jpg")) ["jpg", avatar.get("jpg") as string];
    else if (avatar.has("webp")) ["webp", avatar.get("webp") as string];
    else {
        console.warn(`No avatar found for user ${target.id} in guild ${guildId}!`)
    }
    return ["", target.displayAvatarURL()];
}

/* -----------------------------
 * Permission Functions
 * Used in guilds
  ----------------------------- */

  /**
   * Checks if the given user in the given guild has a permission or set of permissions
   * Returns true if the user has the permission(s) and false if not
   * @param permissions 
   * @param guild 
   * @param user 
   * @returns 
   */
export const hasPermissions = ( permissions: PermissionsBitField[] | PermissionsBitField | bigint | bigint[], guild: Guild, user: User ): boolean => {
    // Bot owner ID overrides all permissions
    if (process.env.OWNER_ID && user.id == process.env.OWNER_ID) return true;
    // Admin overrides all permissions
    if (guild.ownerId == user.id) return true;
    const member = guild.members.cache.get(user.id);
    // No permissions in DMs - DM-specific commands shouldn't even call this function
    if (!member) return false;
    // Otherwise, check server permissions
    return member.permissions.has(permissions);
}