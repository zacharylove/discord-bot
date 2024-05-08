import { EmbedBuilder, Message, MessageReaction, TextChannel, User } from "discord.js";
import { BOT } from "../index.js";
import { GuildDataInterface, StarboardLeaderboard, StarboardPost } from "../database/models/guildModel.js";
// @ts-ignore
import { default as config } from "../config/config.json" assert { type: "json" };
import { getGuildDataByGuildID, isStarboardEnabled, removeStoredStarboardPost, setStarboardDefaults, update } from "../database/guildData.js";
import { truncateString } from "../utils/utils.js";
import { getUserData } from "../database/userData.js";


 /**
     * Retrieves the starboard channel for the guild (if any)
     * @param guildData 
     * @returns Starboard Channel, null if none found
     */
 export const getStarChannel = async (guildData: GuildDataInterface): Promise<TextChannel | null> => {
    // Check if message is already in starboard
    const starChannel = BOT.channels.cache.get(guildData.channels.starboardChannelId );
    
    if (starChannel == undefined) {
        console.error("Starboard channel not found");
        return null;
    }
    if (!starChannel.isTextBased() || starChannel.isDMBased()) {
        console.error("Starboard channel is not a text channel");
        return null;
    }
    if (starChannel instanceof TextChannel) {
        return starChannel;
    } 
    return null;
}

/**
 * Retrieves the starboard message for the given message id (if one exists)
 * @param guildData 
 * @param messageId 
 * @param starChannel 
 * @returns 
 */
export const getExistingStarboardMessage = async (guildData: GuildDataInterface, messageId: string, starChannel: TextChannel): Promise<Message<boolean> | null> => {
    let messageList: Message[] = new Array();
    const messages = await starChannel.messages.fetch({ limit: config.starboard.config.fetchLimit });
    // Filter to be one type
    messages.forEach( m => { if (m.embeds.length > 0 && m.author.bot) messageList.push(m) } );

    // match embed pattern
    const starboardMessage = messageList.find( m => 
        m.embeds[0].footer != null && m.embeds[0].footer.text.endsWith(`${messageId}`) && m.author == BOT.user
    );
    if (starboardMessage == undefined) {
        console.debug("No existing starboard message found");
        return null;
    }

    return starboardMessage;
}

/**
 * The main method for starboard parsing
 * @param reaction 
 * @param user 
 * @param increment 
 * @returns 
 */
export const parseStarReact = async (reaction: MessageReaction, user: User, increment: boolean) => {
    // Check if starboard scanning is enabled
    if (reaction.message.guildId) {
        const guildData = await getGuildDataByGuildID(reaction.message.guildId)
        if ( await isStarboardEnabled(guildData)) {
            // Check if reaction matches starboard emoji
            const guildData: GuildDataInterface = await getGuildDataByGuildID(reaction.message.guildId);
            // Ignore blacklisted channels
            if (guildData.starboard.blacklistEnabled && guildData.starboard.blacklistChannels.includes(reaction.message.channelId)) {
                return;
            }
            // Now the message has been cached and is fully available
            if (increment) console.debug(`${reaction.message.author}'s message "${reaction.message.content}" gained a reaction!`);
            else console.debug(`${reaction.message.author}'s message "${reaction.message.content}" lost a reaction!`);

            
            var guildDataUpdated: boolean = false;
            // Check if database has starboard emoji set- set to default if not
            await setStarboardDefaults(reaction.message.guildId);

            // Check if starboard channel has been set
            if (guildData.channels.starboardChannelId == "" || guildData.channels.starboardChannelId == undefined) {
                console.debug("Starboard channel not set, not scanning");
                return;
            }

            //console.debug(`Checking if reaction matches starboard emoji: ${reaction.emoji.name} == ${guildData.starboard.emoji}`);
            if (guildData.starboard.emoji == reaction.emoji.name) {
                console.debug("Reaction matches starboard emoji");
                // If starboard post exists
                const starChannel: TextChannel | null = await getStarChannel(guildData);
                if (!starChannel) return;
                let starboardMessage = await getExistingStarboardMessage(guildData, reaction.message.id, starChannel);

                if ( reaction.message.author == null || !reaction.message.guild ) {
                    return;
                }

                // Check if one of the reactions is from the message author
                let selfStar: boolean = false;
                selfStar = reaction.users.cache.has(reaction.message.author.id);

                if (starboardMessage) {
                    let reactionCount: number = parseInt(starboardMessage.content.split(" ")[1]);
                    if (increment) reactionCount++;
                    else reactionCount--;
                    // Delete if below threshold
                    if ( reactionCount < guildData.starboard.threshold ) {
                        starboardMessage.delete();
                        reaction.message.reactions.cache.get(guildData.starboard.successEmoji)?.remove();

                        const postToRemove: StarboardPost = {
                            messageID: starboardMessage.id,
                            channelID: starboardMessage.channelId,
                        }


                        removeStoredStarboardPost(guildData.id, postToRemove);
                        // decrement user's star count if not self-starred
                        if (!selfStar) {
                            getUserData(reaction.message.author.id).then( userData => {
                                if (!userData) return;
                                if (userData.numStarboardMessages == undefined) userData.numStarboardMessages = 0;
                                else userData.numStarboardMessages--;
                                userData.save();
                            });
                        }
                        guildDataUpdated = true;
                    } 
                    // Edit if above threshold
                    else {
                        starboardMessage.edit(`${reaction.emoji} ${reactionCount} - <#${reaction.message.channelId}>`);
                    }

                } 
                // If starboard post does not exist and now above threshold
                else if (reaction.count >= guildData.starboard.threshold) {
                    // Deny starring own starboard posts
                    if (reaction.message.author == BOT.user && reaction.message.embeds[0].footer?.text?.includes("ID:")) {
                        reaction.message.react("❌");
                        return;
                    }


                    // Add success reaction to original message
                    if (guildData.starboard.successEmoji != null ) {
                        reaction.message.react(guildData.starboard.successEmoji);
                    }

                    let footer = "";
                    let messageContent = `${guildData.starboard.emoji} ${reaction.count}`;
                    let author = "";

                    const displayName = (await reaction.message.guild.members.fetch(reaction.message.author.id)).displayName;
                    if ( displayName != reaction.message.author.username ) {
                        author += `${displayName} (${reaction.message.author.username})`;
                    } else {
                        author += reaction.message.author.username;
                    }

                    if (reaction.message.author.bot) author += " [Bot]";

                    
                    if (selfStar) footer += "Self Starred | ";
                    footer += `ID: ${reaction.message.id}`;
                    console.debug("No existing starboard message found, creating...");
                    // Create new message
                    const embed: EmbedBuilder = new EmbedBuilder()
                        .setColor( Math.floor(Math.random()*16777215) )
                        .setFooter({ text: footer })
                        .setTimestamp(reaction.message.createdAt)
                        .setAuthor({ name: author, iconURL: reaction.message.author.displayAvatarURL() });

                    // Add replying to message if exists
                    if (reaction.message.reference != null) {
                        const repliedMessages = await reaction.message.channel.messages.fetch({ around: reaction.message.reference.messageId, limit: 1});
                        if (repliedMessages.size > 0) {
                            const repliedMessage = repliedMessages.first()
                            if (repliedMessage) {
                                embed.addFields({ name: "Replying to", value: `[${repliedMessage.author.username}](${repliedMessage.url}): *${truncateString(repliedMessage.content, 100)}*`});
                            }
                        }
                    }

                    let attachmentsString = "";

                    // Check if original message is an embed
                    if (reaction.message.embeds.length > 0) {
                        let description = "";

                        if (reaction.message.content && reaction.message.content.length > 0) {
                            description += reaction.message.content + "\n";
                        }
                        // Add main embed description + image
                        reaction.message.embeds.forEach( e => {
                            if (e.description) { description += `**${e.title? e.title: "Description"}**: ${e.description}\n` };
                            if (e.image) {
                                embed.setImage(e.image.url);
                            }
                        });
                        embed.setDescription(description);

                    } 
                    // If from a normal user
                    else {
                        // Add text if exists
                        if (reaction.message.content && reaction.message.content.length > 0) {
                            // Add tenor gif if exists
                            if (reaction.message.content.includes("tenor.com/view/")) {
                                const tenorURL = reaction.message.content.split("tenor.com/view/")[1].split(" ")[0];
                                embed.setImage(`https://media.tenor.com/images/${tenorURL}/tenor.gif`);
                                // Remove tenor url from message content
                                messageContent = messageContent.replace(`https://tenor.com/view/${tenorURL}`, "");
                            } 
                            // Add attachment url if exists
                            if (reaction.message.content.includes("cdn.discordapp.com/attachments/")) {
                                const attachmentURL = reaction.message.content.split("cdn.discordapp.com/attachments/")[1].split(" ")[0];
                                embed.setImage(`https://cdn.discordapp.com/attachments/${attachmentURL}`);
                                // Remove attachment url from message content
                                messageContent = messageContent.replace(`https://cdn.discordapp.com/attachments/${attachmentURL}`, "");
                            }
                            embed.setDescription(reaction.message.content);
                        }

                        // Add image if exists
                        let attachments = reaction.message.attachments;

                        if (attachments.size > 0) {

                            // One attachment
                            if (attachments.size == 1) {
                                const attachment = attachments.first();
                                if (attachment) {
                                    if (attachment.contentType?.startsWith("image")) {
                                        embed.setImage(attachment.url);
                                    } else {
                                        attachmentsString += `[${attachment.name}](${attachment.url})\n`;
                                    }
                                }
                            }
                            // Multiple attachments
                            else {
                                // Embed first image
                                const attachment = attachments.first();
                                if (attachment && attachment.contentType?.startsWith("image")) {
                                    embed.setImage(attachment.url);
                                }

                                attachments.forEach( a => {
                                    attachmentsString += `[${a.name}](${a.url})\n`;
                                });
                                
                            }
                        }


                        if ( attachmentsString.length > 0 ) {
                            embed.addFields({ name: "Attachments", value: attachmentsString, inline: true});
                        }

                    }

                    embed.addFields(
                        { name: "Original", value: `[Jump!](${reaction.message.url})`, inline: true },
                    )

                    starboardMessage = await starChannel.send({ content: messageContent, embeds: [embed] });
                    guildData.starboard.posts.push({
                        messageID: starboardMessage.id,
                        channelID: starboardMessage.channelId,
                    });
                    guildDataUpdated = true;
                    // Increment user's star count if not self-starred
                    if (!selfStar) {
                        getUserData(reaction.message.author.id).then( userData => {
                            if (!userData) return;
                            if (userData.numStarboardMessages == undefined) userData.numStarboardMessages = 0;
                            userData.numStarboardMessages++;
                            userData.save();
                        });
                    }
                }

                if (starboardMessage) {
                    let leaderboard: StarboardLeaderboard[] = guildData.starboard.leaderboard;
                    let entryAdded: boolean = false;
                    // Check reactionCount against guild leaderboard
                    // NOTE: leaderboard will hold the top 15 but will only show top 10- assume sorted
                    if (leaderboard == undefined) guildData.starboard.leaderboard = new Array();
                    // Update leaderboard entry if exists
                    const leaderboardEntry = leaderboard.find( e => e.messageID == reaction.message.id );
                    if (leaderboardEntry) {
                        console.debug("Updating existing entry in leaderboard")
                        leaderboardEntry.numReactions = reaction.count;
                        leaderboardEntry.timestamp = new Date();
                    } 
                    // If reactionCount is above the minimum numReactions entry in guildData.starboard.leaderboard, add to leaderboard
                    else {
                        // If no entries yet
                        if (leaderboard.length == 0) {
                            // Add new entry
                            leaderboard.push({
                                messageID: starboardMessage.id,
                                channelID: starboardMessage.channelId,
                                originalMessageID: reaction.message.id,
                                originalChannelID: reaction.message.channelId,
                                timestamp: new Date(),
                                authorID: reaction.message.author.id,
                                numReactions: reaction.count,
                            });
                            // Increment counter
                            if(guildData.counters.numStarboardPosts) guildData.counters.numStarboardPosts++;
                            else guildData.counters.numStarboardPosts = 1;
                            guildDataUpdated = true;
                            entryAdded = true;
                        } else {
                            // Select the smallest numReactions entry in the leaderboard
                            const minEntry = leaderboard.reduce( (prev, curr) => prev.numReactions < curr.numReactions ? prev : curr );
                            if (reaction.count > minEntry.numReactions || leaderboard.length < 15) {
                                console.debug("New entry added to leaderboard")
                                // Remove the smallest entry if there are already 15 entries
                                if (leaderboard.length >= 15) {
                                    console.debug("Removing smallest entry from leaderboard")
                                    leaderboard = leaderboard.filter( e => e != minEntry );
                                    // Remove the hall of fame trophy message
                                    const originalStarboardMessage = starChannel.messages.cache.get(minEntry.messageID);
                                    if (originalStarboardMessage) {
                                        originalStarboardMessage.edit(originalStarboardMessage.content.split(" - 🏆")[0]);
                                    }
                                }
                                // Add new entry
                                const leaderboardEntry = {
                                    messageID: starboardMessage.id,
                                    channelID: starboardMessage.channelId,
                                    originalMessageID: reaction.message.id,
                                    originalChannelID: reaction.message.channelId,
                                    timestamp: new Date(),
                                    authorID: reaction.message.author.id,
                                    numReactions: reaction.count,
                                };
                                leaderboard.push(leaderboardEntry);
                                // Sort leaderboard
                                leaderboard.sort( (a, b) => b.numReactions - a.numReactions );
                                
                                // Check if in top 10
                                if (leaderboard.indexOf(leaderboardEntry) < 10) {
                                    entryAdded = true;
                                }
                                guildDataUpdated = true;

                                guildData.starboard.leaderboard = leaderboard;
                            }
                        }
                    }
                    // React with a trophy emoji if post was added to leaderboard
                    if (entryAdded) {
                        await reaction.message.react("🏆");
                        await starboardMessage.edit( starboardMessage.content + ` - 🏆 Hall of Fame!`);
                    }
                }

                if (guildDataUpdated) {
                    try {
                        update(guildData);
                    } catch(e) {
                        console.error(e);
                        await reaction.message.channel.send("Database error occurred when updating starboard leaderboard.");
                    }
                }

            }

            
        } else {
            console.debug("Reaction received, but starboard scanning is disabled");
        }
    }
}