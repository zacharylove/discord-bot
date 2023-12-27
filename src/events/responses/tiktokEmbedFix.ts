import { DMChannel, Message, PermissionsBitField } from "discord.js";
import { hasPermissions } from "../../utils/userUtils.js";



/**
 * Given a string, checks if it is a valid X/Twitter post URL
 * Should check if string is URL before calling this function.
 * @param url 
 */
export const isTikTokURL = (url: string): boolean => {
    const regex = new RegExp('https?://(www\\.)?tiktok\\.com/@[^/]+/video/[^/]+');
    const match = url.match(regex);
    if (match) return true;
    return false;

}

export const reformatTikTokUrl = (url: string) => {
    return url.replace("tiktok.com", "vxtiktok.com");
}

export const tikTokEmbedFix = async (message: Message, postURLs: string[]) => {
    if (!message.guildId || !message.guild || message.author.bot || message.channel instanceof DMChannel) return;
    // Only fix embeds if the author has permission to embed
    if (!hasPermissions(PermissionsBitField.Flags.EmbedLinks, message.guild, message.author)) return;

    // Parse (potentially many) x urls
    const fixedURLs: string[] = [];
    let temp: { username: string; id: string; } | null;
    for (const post of postURLs) {
        if (isTikTokURL(post)) fixedURLs.push(reformatTikTokUrl(post))
    }
    if (fixedURLs.length == 0) return;

    // APPARENTLY discord doesn't allow sending ephemeral messages in response to a regular Message... so can't ask for user confirmation.
    // Just gonna replace it without consent :/

    let responseMessage = "";
    if (fixedURLs.length > 1) responseMessage += `\nDetected ${fixedURLs.length} TikTok URLs. [Fixed embed]`;
    else responseMessage += `\nDetected a TikTok URL. [Fixed embed]`;
    // If there are multiple posts, we will make a new reply for every post after the first, allowing all of them to embed.
    responseMessage += `(${fixedURLs.shift()!})`
    responseMessage += `\n*This feature can be disabled by an administrator using \`/settings feature disable tiktokEmbedFix\`*`;

    let prevMessage: Message = message;
    // Remove original embed
    prevMessage.suppressEmbeds(true);
    prevMessage = await prevMessage.reply({content: responseMessage});
    while (fixedURLs.length > 0) {
        prevMessage = await prevMessage.reply({content: `${fixedURLs.shift()!}`});
    }
    
}
