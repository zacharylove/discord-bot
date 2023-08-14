import { Channel, EmbedBuilder, GatewayIntentBits, Message, MessageManager, MessageReaction, Partials, TextChannel, User } from "discord.js";
import { EventInterface } from "interfaces/Event";
import { starboardConfig } from "../config/config.json";
import { getGuildDataByGuildID, isStarboardEnabled, setStarboardDefaults, setStarboardEmojis } from "../database/guildData";
import { GuildDataInterface } from "../database/models/guildModel";
import { BOT } from "../index";
import { truncateString } from "../utils/utils";


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
        m.embeds[0].footer != null && m.embeds[0].footer.text.endsWith(`${messageId}`)
    );
    if (starboardMessage == undefined) {
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
        if (guildData.starboard.emoji == undefined || guildData.starboard.successEmoji == undefined) {
            console.log(await setStarboardDefaults(reaction.message.guildId));
        }

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

            if (starboardMessage) {
                let reactionCount: number = parseInt(starboardMessage.content.split(" ")[1]);
                if (increment) reactionCount++;
                else reactionCount--;
                // Delete if below threshold
                if ( reactionCount < guildData.starboard.threshold ) {
                    starboardMessage.delete();
                    reaction.message.reactions.cache.get(guildData.starboard.successEmoji)?.remove();
                } 
                // Edit if above threshold
                else {
                    starboardMessage.edit(`${reaction.emoji} ${reactionCount}`);
                }
            } 
            // If starboard post does not exist and now above threshold
            else if (reaction.count >= guildData.starboard.threshold) {
                // Add success reaction to original message
                if (guildData.starboard.successEmoji != null ) {
                    reaction.message.react(guildData.starboard.successEmoji);
                }

                let footer = "";
                let messageContent = `${guildData.starboard.emoji} ${reaction.count}`;
                let author = "";
                // Check if one of the reactions is from the message author
                let selfStar: boolean = false;
                if ( reaction.message.author == null || !reaction.message.guild ) {
                    return;
                }

                const displayName = (await reaction.message.guild.members.fetch(reaction.message.author.id)).displayName;
                if ( displayName != reaction.message.author.username ) {
                    author += `${displayName} (${reaction.message.author.username})`;
                } else {
                    author += reaction.message.author.username;
                }

                if (reaction.message.author.bot) author += " [Bot]";

                selfStar = reaction.users.cache.has(reaction.message.author.id);
                
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
                        description += `**${e.title? e.title: "Description"}**: ${e.description}\n`;
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
                                    embed.addFields({ name: "Attachment", value: `[${attachment.name}](${attachment.url})`, inline: true});
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
                

                

                await starChannel.send({ content: messageContent, embeds: [embed] });
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