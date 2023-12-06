import { DMChannel, Message, PermissionsBitField } from "discord.js";
import { hasPermissions } from "../../utils/userUtils.js";



/**
 * Given a string, checks if it is a valid X/Twitter post URL
 * Should check if string is URL before calling this function.
 * @param url 
 */
export const parseXURL = (url: string): {username: string, id: string} | null => {
    // Two types of URLS: twitter and X
    // http(s)://x.com/[user]/[status]/[id]
    // http(s)://twitter.com/[user]/[status]/[id]
    const regex = new RegExp('^https?://(x|twitter)\\.com/([^/]+)/status/(\\d+)$');
    const match = url.match(regex);

    if (match) {
        if (match.length < 3) return null;
        console.debug(`Match: ${match}`)
        const username = match[2];
        const postId = match[3];
        console.debug(`Parsed X post URL: Username: ${username}, Post ID: ${postId}`);
        return {username: username, id: postId}
    }
    return null;

}

export const reformatXUrl = (info: { username: string; id: string; }) => {
    return `https://fxtwitter.com/${info.username}/status/${info.id}`;
}

export const twitterEmbedFix = async (message: Message, postURLs: string[]) => {
    if (!message.guildId || !message.guild || message.author.bot || message.channel instanceof DMChannel) return;
    // Only fix embeds if the author has permission to embed
    if (!hasPermissions(PermissionsBitField.Flags.EmbedLinks, message.guild, message.author)) return;

    // Parse (potentially many) x urls
    const xPostUrls: { username: string; id: string; }[] = [];
    let temp: { username: string; id: string; } | null;
    for (const post of postURLs) {
        temp = parseXURL(post);
        if (temp != null) xPostUrls.push(temp);
    }
    if (xPostUrls.length == 0) return;

    // APPARENTLY discord doesn't allow sending ephemeral messages in response to a regular Message... so can't ask for user confirmation.
    // Just gonna replace it without consent :/

    let responseMessage = "";
    if (xPostUrls.length > 1) responseMessage += `\nDetected ${xPostUrls.length} Twitter/X URLs. Fixed embed: `;
    else responseMessage += `\nDetected a Twitter/X URL. Fixed embed: `;
    // If there are multiple posts, we will make a new reply for every post after the first, allowing all of them to embed.
    responseMessage += `${reformatXUrl(xPostUrls.shift()!)}`
    responseMessage += `\n*This feature can be disabled by an administrator using \`/settings feature disable twitterEmbedFix\`*`;

    let prevMessage: Message = message;
    prevMessage = await prevMessage.reply({content: responseMessage});
    while (xPostUrls.length > 0) {
        prevMessage = await prevMessage.reply({content: `${reformatXUrl(xPostUrls.shift()!)}`});
    }
    
}