import { ActionRowBuilder, ButtonInteraction, ButtonStyle, CacheType, Channel, CommandInteraction, ComponentType, Message, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { CommandInterface, Feature } from "../../../interfaces/Command.js";
import { getGuildDataByGuildID, removeStoredStarboardPost, update } from "../../../database/guildData.js";
import { hasPermissions } from "../../../utils/userUtils.js";
import { ButtonBuilder, EmbedBuilder, MessageActionRowComponentBuilder } from "@discordjs/builders";
import { BOT } from "../../../index.js";
import { checkBotChannelPermission, checkBotGuildPermission, confirmationMessage, getChannelFromString, getEmojiFromString, sleep, truncateString } from "../../../utils/utils.js";
import { GuildDataInterface, StarboardLeaderboard, StarboardPost } from "../../../database/models/guildModel.js";
import { commandNotImplemented } from "../../../utils/commandUtils.js";


export const createStarboardSettingsEmbed =  async (interaction: Message<boolean>, guildData: GuildDataInterface): Promise<EmbedBuilder> => {   
    const starboardEnabled = guildData.messageScanning.starboardScanning && guildData.messageScanning.starboardScanning == true;
    const embed = new EmbedBuilder()
        .setTitle(`⭐ Starboard Settings for ${interaction.guild?.name}`)
        .setAuthor({name: `Starboard Status: ${starboardEnabled ? "ENABLED" : "DISABLED"}`});
        ;
    
    let description = "Welcome to the starboard settings menu.\n";
    description += "A starboard is a designated text channel where messages that receive a configurable number of a specific reaction will be reposted and immortalized.\n";
    description += "\nHere, you can set up and customize the following for this server's starboard:\n";
    description += "- The text channel where starboarded messages are posted\n";
    description += "- The number of reactions required for a message to be posted to the starboard\n";
    description += "- The reaction emoji that is used to determine whether a message will be starboarded\n"
    description += "- The emoji that the bot will react with when a message has been added to the starboard\n";
    description += "\nPress the buttons below to modify your settings.";
    embed.setDescription(description);

    let starboardSetting = "";
    let blacklistSetting = "";
    starboardSetting += `- **Emoji**: ${guildData.starboard.emoji ? guildData.starboard.emoji : "NOT SET" }\n`;
    starboardSetting += `- **Reaction Threshold**: ${guildData.starboard.threshold ? guildData.starboard.threshold : "NOT SET"}\n`;
    starboardSetting += `- **Success Emoji**: ${guildData.starboard.successEmoji ? guildData.starboard.successEmoji : "NOT SET"}\n`;
    starboardSetting += `- **Channel Blacklist**: `;
    if (guildData.starboard.blacklistEnabled) {
        starboardSetting += `ENABLED\n`
        blacklistSetting = "- <#" + guildData.starboard.blacklistChannels.join(">\n- <#") + ">"
    } else {
        starboardSetting += `DISABLED\n`
    }
    embed.addFields({name: "Starboard Settings", value: starboardSetting, inline: true});
    if (guildData.starboard.blacklistEnabled) embed.addFields({name: "Blacklisted Channels", value: blacklistSetting, inline: true});

    return embed;
}


const sendReplyAndCollectResponses = async (
    interaction: ButtonInteraction<CacheType>,
    guildData: GuildDataInterface,
    type: string,
    authorId: string
) => {
    let replyMessage = "";
    const messageCollectorFilter = (m: Message<boolean>) => m.author.id === authorId;

    switch (type) {
        case 'setchannel':
            replyMessage = `Send a message tagging the channel you would like to set as the starboard.\n`;
            replyMessage += `Say "none" to disable the starboard, or "cancel" to cancel.`;
            await interaction.followUp({ content: replyMessage, ephemeral: true });
            break;
        case 'setemoji':
            replyMessage = `Send a message with the emoji you would like to set as the starboard reaction emoji.\n`;
            replyMessage += `Say "cancel" to cancel.`;
            await interaction.followUp({ content: replyMessage, ephemeral: true });

            break;
        case 'setsuccessemoji':
            replyMessage = `Send a message with the emoji you would like to set as the starboard success emoji.\n`;
            replyMessage += `Say "cancel" to cancel.`;
            await interaction.followUp({ content: replyMessage, ephemeral: true });

            break;
        case 'setthreshold':
            replyMessage = `Send a message with the reaction threshold for the starboard.\n`;
            replyMessage += `Say "cancel" to cancel.`;
            await interaction.followUp({ content: replyMessage, ephemeral: true });

            break;
        case 'setblacklist':
            replyMessage = `Tag the channels you would like to blacklist, one channel per message. If you would like to remove a channel from the blacklist, put a "-" in front of it, like "-#general".\n`;
            replyMessage += `Say "done" when finished.`;
            await interaction.followUp({ content: replyMessage, ephemeral: true });

            break;
    }
    const selectionCollector = interaction.channel!.createMessageCollector({ filter: messageCollectorFilter, time: 60000});
    let collected: boolean = false;
    let emoji;
    let numBlacklisted = 0;
    try {
        selectionCollector.on('collect', async messageResponse => {
            if (messageResponse.author.id == authorId && !collected) {
                collected = true;
                let collectedMessage = messageResponse.content;
                if (collectedMessage.toLowerCase() == "cancel") {
                    await selectionCollector.emit('end');
                    return;
                }

                switch (type) {
                    case 'setchannel':
                        if (collectedMessage.toLowerCase() == "none") {
                            await messageResponse.reply({content: `${confirmationMessage()} starboard is now disabled.`});
                            guildData.messageScanning.starboardScanning = false;
                            await update(guildData);
                            await selectionCollector.emit('end');
                            return;
                        } else {
                            const channel = await getChannelFromString(collectedMessage, messageResponse.guild!);
                            // If still invalid, bad channel
                            if (channel == null) {
                                await messageResponse.reply({content: "I can't find that channel. Try again."});
                            } else {
                                await messageResponse.reply({content: `${confirmationMessage()} the starboard channel has been set to <#${channel.id}>.`});
                                guildData.channels.starboardChannelId = channel.id;
                                await update(guildData);
                                await selectionCollector.emit('end');
                                return;
                            }
                        }
                        break;
                    case 'setemoji':
                        emoji = await getEmojiFromString(collectedMessage, BOT);
                        if (emoji == null) {
                            await messageResponse.reply({content: "I can't find an emoji in that message. Try using an emoji I have access to."});
                        } else {
                            await messageResponse.reply({content: `${confirmationMessage()} the starboard emoji is now set to ${emoji}.`});
                            guildData.starboard.emoji = emoji;
                            await update(guildData);
                            await selectionCollector.emit('end');
                            return;
                        }
                        break;
                    case 'setsuccessemoji':
                        emoji = await getEmojiFromString(collectedMessage, BOT);
                        if (emoji == null) {
                            await messageResponse.reply({content: "I can't find an emoji in that message. Try using an emoji I have access to."});
                        } else {
                            await messageResponse.reply({content: `${confirmationMessage()} the bot will react to messages that reach the reaction threshold with ${emoji}.`});
                            guildData.starboard.successEmoji = emoji;
                            await update(guildData);
                            await selectionCollector.emit('end');
                            return;
                        }
                        break;
                    case 'setthreshold':
                        const isNumber = Number.isNaN(Number(collectedMessage));
                        if (isNumber) {
                            const threshold = Number(collectedMessage);
                            if (threshold <= 0) {
                                await messageResponse.reply({content: `Starboard reaction threshold cannot be 0 or negative.`});
                            } else {
                                await messageResponse.reply({content: `${confirmationMessage()} messages now require ${threshold}x${guildData.starboard.emoji} reactions to be added to the starboard.`});
                                guildData.starboard.threshold = threshold;
                                await update(guildData);
                                await selectionCollector.emit('end');
                                return;
                            }
                        } else {
                            await messageResponse.react("❌");
                        }
                        break;
                    case 'setblacklist':
                        if (collectedMessage.toLowerCase() == "done") {
                            if (guildData.starboard.blacklistChannels.length == 0) {
                                await messageResponse.reply(`${confirmationMessage()} Disabled the starboard blacklist.`);
                            } else if (numBlacklisted != 0) {
                                await messageResponse.reply(`${confirmationMessage()} ${numBlacklisted > 0 ? "Added" : "Removed"} ${Math.abs(numBlacklisted)} channels ${numBlacklisted > 0 ? "to" : "from"} the starboard blacklist.`);
                            } else {
                                await messageResponse.reply(`${confirmationMessage()} no changes made to the starboard blacklist.`);
                            }
                            await selectionCollector.emit('end');
                            return;
                        }
                        let remove:boolean = false;
                        if (collectedMessage.startsWith("-")) {
                            remove = true
                        }
                        const channel = await getChannelFromString(collectedMessage, messageResponse.guild!);
                        
                        if (channel == null) {
                            await messageResponse.react("❌");
                        } else {
                            ;
                            if (remove) {
                                if (!guildData.starboard.blacklistChannels.includes(channel.id)) {
                                    await messageResponse.react("🚫");
                                } else {
                                    guildData.starboard.blacklistChannels.splice(guildData.starboard.blacklistChannels.indexOf(channel.id), 1);
                                    await await messageResponse.react("👍");
                                    if (guildData.starboard.blacklistChannels.length == 0 && guildData.starboard.blacklistEnabled) guildData.starboard.blacklistEnabled = false;
                                    await update(guildData);
                                    numBlacklisted--;
                                }
                            } else {
                                if (guildData.starboard.blacklistChannels.includes(channel.id)) {
                                    await messageResponse.react("🚫");
                                } else {
                                    guildData.starboard.blacklistChannels.push(channel.id);
                                    if (guildData.starboard.blacklistEnabled == false) guildData.starboard.blacklistEnabled = true;
                                    await update(guildData);
                                    await messageResponse.react("👍");
                                    numBlacklisted++;
                                }
                            } 
                        }
                        collected = false;
            
                        break;
                }
            }
        });
    } catch (e) {
        console.debug(`Error: ${e}`);
    }
}

export const sendStarboardSettingsEmbedAndCollectResponses = async (
    interaction: Message<boolean>,
    guildData: GuildDataInterface,
    authorId: string,
    selectRow: ActionRowBuilder<MessageActionRowComponentBuilder>
) => {
    const embed = await createStarboardSettingsEmbed(interaction, guildData);
    const firstButtonRow: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();
    const secondButtonRow: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();

    const setChannelButton = new ButtonBuilder()
        .setLabel("Set Channel")
        .setStyle(ButtonStyle.Primary)
        .setCustomId('setchannel');
    firstButtonRow.addComponents(setChannelButton);

    const setEmojiButton = new ButtonBuilder()
        .setLabel("Emoji")
        .setStyle(ButtonStyle.Primary)
        .setCustomId('setemoji');
    firstButtonRow.addComponents(setEmojiButton);
    const setSuccessButton = new ButtonBuilder()
        .setLabel("Success Emoji")
        .setStyle(ButtonStyle.Primary)
        .setCustomId('setsuccessemoji');
    firstButtonRow.addComponents(setSuccessButton);
    const setThresholdButton = new ButtonBuilder()
        .setLabel("Threshold")
        .setStyle(ButtonStyle.Primary)
        .setCustomId('setthreshold');
    secondButtonRow.addComponents(setThresholdButton);
    const setBlacklistButton = new ButtonBuilder()
        .setLabel("Channel Blacklist")
        .setStyle(ButtonStyle.Primary)
        .setCustomId('setblacklist');
    secondButtonRow.addComponents(setBlacklistButton);

    const doneButton = new ButtonBuilder()
        .setCustomId('done')
        .setLabel('Done')
        .setStyle(ButtonStyle.Secondary)
    ;
    secondButtonRow.addComponents(doneButton);

    let response: Message<boolean> = await interaction.edit({content: "", embeds: [embed], components: [selectRow, firstButtonRow, secondButtonRow]});
    try {
        const buttonCollectorFilter = (i: { user: { id: string; }; }) => i.user.id === authorId;
        const buttonCollector = response.createMessageComponentCollector({ componentType: ComponentType.Button, filter: buttonCollectorFilter, time: 60000});
        let collected: boolean = false;

        buttonCollector.on('collect', async buttonResponse => {
            try { await buttonResponse.deferReply() } catch (e) {}
            if (buttonResponse.user.id == authorId && !collected) {
                if (buttonResponse.customId == 'done') {
                    collected = true;
                    sleep(200).then( async () => {try {await response.delete();} catch (e) {}});
                    await buttonCollector.emit('end');
                    return;
                } else {
                    collected = true;
                    sleep(200).then( async () => await sendReplyAndCollectResponses(buttonResponse, guildData, buttonResponse.customId, authorId) );
                    
                }
            }
        });
    } catch (e) {
        console.debug(`Error: ${e}`);
    }
    
}

const retrieveStarboardLeaderboard = async (interaction: any): Promise<EmbedBuilder> => {
    const leaderboard = new EmbedBuilder()
        .setTitle("Starboard Leaderboard");

    const guildIconURL = interaction.guild.iconURL();
    if(guildIconURL) leaderboard.setThumbnail(guildIconURL);

    let topUsersString = "";
    let topPostsString = "";
        
    let originalLink = "";
    let starboardPostLink = "";
    let originalContent = "";
    let counter = 0;

    let channel: Channel | null;
    let message: Message | null;

    const guildData = await getGuildDataByGuildID(interaction.guildId);
    if (!guildData.messageScanning.starboardScanning) {
        topPostsString += 'Starboard is currently disabled on this server';
    } else if (guildData.starboard.leaderboard.length == 0) {
        topPostsString += 'No posts have been added to the starboard yet';
    } else {
        // Fill out the top 10 posts
        const topTen: StarboardLeaderboard[] = guildData.starboard.leaderboard.slice(0,10);

        for ( const post of topTen ) {
            counter++;
            originalLink = `https://discord.com/channels/${interaction.guildId}/${post.originalChannelID}/${post.originalMessageID}`;
            starboardPostLink = `https://discord.com/channels/${interaction.guildId}/${post.channelID}/${post.messageID}`;

            channel = await BOT.channels.fetch(post.originalChannelID);
            if (channel && channel.isTextBased()) {
                message = await channel.messages.fetch(post.originalMessageID);
                if (message) {
                    originalContent = message.content;
                }
            }
            leaderboard.addFields({ 
                name: `${guildData.starboard.emoji} ${post.numReactions} - ${starboardPostLink}`, 
                value: `**<@${post.authorID}>:** ${truncateString(originalContent, 150)} \n\n`
            });
        }       
    }
    if (topPostsString.length == 0) {
        topPostsString = `Top ${counter} posts in ${interaction.guild.name}`;
    }
    leaderboard.setDescription(topPostsString);
    return leaderboard;

}

const retrieveRandomStarboardPost = async (interaction: any) => {
    const guildData = await getGuildDataByGuildID(interaction.guildId);
    let valid: boolean = false;
    let post: StarboardPost;
    let maxCounter = 0;

    let message = null;
    while (!valid) {
        maxCounter++;
        if (maxCounter == 10) {
            await interaction.editReply("ERROR: Could not find a valid post after 10 tries.");
            return;
        }
        if (guildData.starboard.posts.length == 0) {
            await interaction.editReply("No posts found.");
            return;
        }
        post = guildData.starboard.posts[Math.floor(Math.random() * guildData.starboard.posts.length)]

        // Retrieve embed from 
        const channel = await BOT.channels.fetch(post.channelID);
        if (!channel || !channel.isTextBased()) {
            await interaction.editReply("ERROR: Invalid channel found.");
            removeStoredStarboardPost(interaction.guildId, post);
            continue;
        }
        message = await channel.messages.fetch(post.messageID);
        if (!message) {
            await interaction.editReply("ERROR: Invalid message found.");
            removeStoredStarboardPost(interaction.guildId, post);
            continue;
        }
        valid = true;
    }
    if (message == null || !message.embeds || message.embeds.length == 0) {
        await interaction.editReply("ERROR: message invalid");
        return;
    }
    await interaction.editReply({ content: `From <@${message.author.id}> - ${message.url}`,embeds: message.embeds });
}


export const starboard: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('starboard')
        .setDescription('The place where messages are immortalized')
        .addSubcommand(subcommand =>
            subcommand
                .setName('top')
                .setDescription('View the top posts on the starboard')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('random')
                .setDescription('View a random post on the starboard')
        )
    ,
    run: async (interaction: CommandInteraction) => {
        if ( !interaction.guild ) { return; }
        // Disable context menu
        if (!interaction.isChatInputCommand()) {
            await interaction.editReply('This command cannot be used in a context menu');
            return;
        }
        // Disable DMS
        if (!interaction.guildId || !interaction.guild || !interaction.channel) {
            await interaction.editReply('This command cannot be used in DMs');
            return;
        }

        switch (interaction.options.getSubcommand()) {
            case 'top':
                await interaction.editReply({ embeds: [await retrieveStarboardLeaderboard(interaction)] });
                break;
            case 'random':
                await retrieveRandomStarboardPost(interaction);
                break;
        }

        
    },
    properties: {
        Name: 'Starboard',
        Scope: 'global',
        GuildOnly: true,
        DefaultEnabled: true,
        Enabled: true,
        Permissions: [],
        Feature: Feature.Starboard
    }
}