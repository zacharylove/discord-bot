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
    if (xPostUrls.length > 1) responseMessage += `\nDetected ${xPostUrls.length} Twitter/X URLs. [Fixed embed]`;
    else responseMessage += `\nDetected a Twitter/X URL. [Fixed embed]`;
    // If there are multiple posts, we will make a new reply for every post after the first, allowing all of them to embed.
    responseMessage += `(${reformatXUrl(xPostUrls.shift()!)})`
    responseMessage += `\n*This feature can be disabled by an administrator using \`/settings feature disable twitterEmbedFix\`*`;

    let prevMessage: Message = message;
    prevMessage = await prevMessage.reply({content: responseMessage});
    while (xPostUrls.length > 0) {
        prevMessage = await prevMessage.reply({content: `${reformatXUrl(xPostUrls.shift()!)}`});
    }
    
}


/*
// Waiting on the day that rich embeds support video....
import { DMChannel, Message, PermissionsBitField } from "discord.js";
import { hasPermissions } from "../../utils/userUtils.js";
import { VXTwitterAPI, parseXURL, removeTURL } from "../../api/vxTwitterAPI.js";
import { EmbedBuilder } from "@discordjs/builders";
import { validImageURL, validVideoURL } from "../../utils/utils.js";


export const reformatXUrl = (info: { username: string; id: string; }) => {
    return `https://fxtwitter.com/${info.username}/status/${info.id}`;
}

export const twitterEmbedFix = async (message: Message, postURLs: string[]) => {
    if (!message.guildId || !message.guild || message.author.bot || message.channel instanceof DMChannel) return;
    // Only fix embeds if the author has permission to embed
    if (!hasPermissions(PermissionsBitField.Flags.EmbedLinks, message.guild, message.author)) return;

    // Parse (potentially many) x urls
    const xPostEmbeds: EmbedBuilder[] = [];
    const xPostContent: string[] = [];
    let temp: { username: string; id: string; } | null;
    for (const post of postURLs) {
        temp = parseXURL(post);
        if (!temp) continue;
        // Query api
        const response = await VXTwitterAPI.makeRequest(VXTwitterAPI.formRequestURL(temp));
        if (!response) continue;
        const tweetData = response.data;
        console.debug(`Tweet Data: ${tweetData}`);
        const embed = new EmbedBuilder();
        // Title
        if (tweetData.user_name && tweetData.user_screen_name) {
            embed.setAuthor({name:`${tweetData.user_name} (@${tweetData.user_screen_name})`, iconURL: tweetData.user_profile_image_url});
        }
        // URL
        if (tweetData.tweetURL) embed.setURL(tweetData.tweetURL);
        // Date
        if (tweetData.date_epoch) {
            // Convert epoch date to date
            var date = new Date(0);
            date.setUTCSeconds(tweetData.date_epoch);
            embed.setTimestamp(date);
        }
        // Content
        let content = "";
        if (tweetData.text) {
            // Strip t.co urls from content
            content += removeTURL(tweetData.text) + "\n-\n";
            // Add stats
            if (tweetData.retweets) content += `${tweetData.retweets} 🔁  `;
            if (tweetData.likes) content += `${tweetData.likes} ❤️  `;
            if (tweetData.replies) content += `${tweetData.replies} 💬  `;
            
            // Add community note (not implemented)
            embed.setDescription(content);
        }
        // Media
        let message = "Detected a Twitter/X URL. Here's a fixed embed.";
        if(tweetData.mediaURLs && tweetData.mediaURLs.length > 0) {
            // Discord embeds do not support video STILL so we need to send it in the main message
            // Other media can be embedded

            // Look for first image and embed that
            let imageURL = "";
            let videoURLs: string[] = [];
            for (const url of tweetData.mediaURLs) {
                if (imageURL == "" && validImageURL(url)) imageURL = url;
                if (validVideoURL(url)) videoURLs.push(url);
            }
            if (imageURL != "") embed.setImage(imageURL);
            if (videoURLs.length > 0) {
                message += `\n**Media:**\nhttps://video.twimg.com/ext_tw_video/1639187348897296384/pu/vid/1280x720/UXow-KeAkyPDjXmR.mp4\n${videoURLs.join("\n")}`
            }

            embed.setFooter({text: "This feature can be disabled with /settings feature disable twitterEmbedFix"});
        }

        xPostEmbeds.push(embed);
        xPostContent.push(message);

    }
    if (xPostEmbeds.length == 0) return;

    let prevMessage: Message = message;
    while (xPostEmbeds.length > 0) {
        prevMessage = await prevMessage.reply({content: xPostContent.shift()!, embeds: [xPostEmbeds.shift()!]});
    }
    
}
*/