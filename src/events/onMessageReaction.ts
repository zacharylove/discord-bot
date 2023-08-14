import { Channel, EmbedBuilder, GatewayIntentBits, Message, MessageManager, MessageReaction, Partials, TextChannel, User } from "discord.js";
import { EventInterface } from "interfaces/Event";
import { starboardConfig } from "../config/config.json";
import { getGuildDataByGuildID, isStarboardEnabled, setStarboardDefaults, setStarboardEmojis, update } from "../database/guildData";
import { GuildDataInterface } from "../database/models/guildModel";
import { BOT } from "../index";
import { truncateString } from "../utils/utils";
import { getUserData } from "../database/userData";


const getStarChannel = async (guildData: GuildDataInterface): Promise<TextChannel | null> => {
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


const getExistingStarboardMessage = async (guildData: GuildDataInterface, messageId: string, starChannel: TextChannel): Promise<Message<boolean> | null> => {
    let messageList: Message[] = new Array();
    const messages = await starChannel.messages.fetch({ limit: starboardConfig.fetchLimit });
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

const parseStarReact = async (reaction: MessageReaction, user: User, increment: boolean) => {
    // Check if starboard scanning is enabled
    if (reaction.message.guildId && await isStarboardEnabled(reaction.message.guildId)) {
        // Now the message has been cached and is fully available
        if (increment) console.debug(`${reaction.message.author}'s message "${reaction.message.content}" gained a reaction!`);
        else console.debug(`${reaction.message.author}'s message "${reaction.message.content}" lost a reaction!`);

        // Check if reaction matches starboard emoji
        const guildData: GuildDataInterface = await getGuildDataByGuildID(reaction.message.guildId);
        // Check if database has starboard emoji set- set to default if not
        console.debug(await setStarboardDefaults(reaction.message.guildId));

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
            const starboardMessage = await getExistingStarboardMessage(guildData, reaction.message.id, starChannel);

            if ( reaction.message.author == null || !reaction.message.guild ) {
                return;
            }

            // Check if one of the reactions is from the message author
            let selfStar: boolean = false;
            selfStar = reaction.users.cache.has(reaction.message.author.id);

            let newPost = false;

            if (starboardMessage) {
                let reactionCount: number = parseInt(starboardMessage.content.split(" ")[1]);
                if (increment) reactionCount++;
                else reactionCount--;
                // Delete if below threshold
                if ( reactionCount < guildData.starboard.threshold ) {
                    starboardMessage.delete();
                    reaction.message.reactions.cache.get(guildData.starboard.successEmoji)?.remove();
                    // decrement user's star count if not self-starred
                    if (!selfStar) {
                        getUserData(reaction.message.author.id).then( userData => {
                            if (!userData) return;
                            if (userData.numStarboardMessages == undefined) userData.numStarboardMessages = 0;
                            else userData.numStarboardMessages--;
                            userData.save();
                        });
                    }
                } 
                // Edit if above threshold
                else {
                    starboardMessage.edit(`${reaction.emoji} ${reactionCount}`);
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
                    { name: "Channel", value: `<#${reaction.message.channelId}>`, inline: true },
                )

                const message = await starChannel.send({ content: messageContent, embeds: [embed] });
                newPost = true;
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


            if (starboardMessage || newPost) {
                // Check reactionCount against guild leaderboard
                // NOTE: leaderboard will hold the top 15 but will only show top 10- assume sorted
                if (guildData.starboard.leaderboard == undefined) guildData.starboard.leaderboard = new Array();
                // Update leaderboard entry if exists
                const leaderboardEntry = guildData.starboard.leaderboard.find( e => e.messageID == reaction.message.id );
                if (leaderboardEntry) {
                    console.debug("Updating existing entry in leaderboard")
                    leaderboardEntry.numReactions = reaction.count;
                    leaderboardEntry.timestamp = new Date();
                } 
                // If reactionCount is above the minimum numReactions entry in guildData.starboard.leaderboard, add to leaderboard
                else {
                    // If no entries yet
                    if (guildData.starboard.leaderboard.length == 0) {
                        // Add new entry
                        guildData.starboard.leaderboard.push({
                            messageID: reaction.message.id,
                            channelID: reaction.message.channelId,
                            originalMessageID: reaction.message.id,
                            originalChannelID: reaction.message.channelId,
                            timestamp: new Date(),
                            authorID: reaction.message.author.id,
                            numReactions: reaction.count,
                        });
                        update(guildData);
                    } else {
                        // Select the smallest numReactions entry in the leaderboard
                        const minEntry = guildData.starboard.leaderboard.reduce( (prev, curr) => prev.numReactions < curr.numReactions ? prev : curr );
                        if (reaction.count > minEntry.numReactions || guildData.starboard.leaderboard.length < 15) {
                            console.debug("New entry added to leaderboard")
                            // Remove the smallest entry if there are already 15 entries
                            if (guildData.starboard.leaderboard.length >= 15) {
                                console.debug("Removing smallest entry from leaderboard")
                                guildData.starboard.leaderboard = guildData.starboard.leaderboard.filter( e => e != minEntry );
                            }
                            // Add new entry
                            guildData.starboard.leaderboard.push({
                                messageID: reaction.message.id,
                                channelID: reaction.message.channelId,
                                originalMessageID: reaction.message.id,
                                originalChannelID: reaction.message.channelId,
                                timestamp: new Date(),
                                authorID: reaction.message.author.id,
                                numReactions: reaction.count,
                            });
                            // Sort leaderboard
                            guildData.starboard.leaderboard.sort( (a, b) => b.numReactions - a.numReactions );
                            update(guildData);
                        }
                    }
                }
            }

        }

        
    } else {
        console.debug("Reaction received, but starboard scanning is disabled");
    }
}


export const onMessageReactionAdd: EventInterface = {
    run: async(reaction: MessageReaction, user: User) => {
        console.debug("Message reaction received!");
        // When a reaction is received, check if the structure is partial
        if (reaction.partial) {
            // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Something went wrong when fetching the message:', error);
                // Return as `reaction.message.author` may be undefined/null
                return;
            }
        }

        parseStarReact(reaction, user, true);

    },
    properties: {
        Name: "messageReactionAdd",
        Enabled: true,
        Intents: [
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ],
        Partials: [
            Partials.Message,
            Partials.Reaction,
            Partials.Channel,
            Partials.User
        ]
    }
}

export const onMessageReactionRemove: EventInterface = {
    run: async(reaction: MessageReaction, user: User) => {
        console.debug("Message reaction removed!");
        // When a reaction is received, check if the structure is partial
        if (reaction.partial) {
            // If the message this reaction belongs to was removed, the fetching might result in an API error which should be handled
            try {
                await reaction.fetch();
            } catch (error) {
                console.error('Something went wrong when fetching the message:', error);
                // Return as `reaction.message.author` may be undefined/null
                return;
            }
        }


        parseStarReact(reaction, user, false);

    },
    properties: {
        Name: "messageReactionRemove",
        Enabled: true,
        Intents: [
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ],
        Partials: [
            Partials.Message,
            Partials.Reaction,
            Partials.Channel,
            Partials.User
        ]
    }
}