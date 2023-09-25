import { Channel, CommandInteraction, Message, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { CommandInterface } from "../../interfaces/Command.js";
import { getGuildDataByGuildID, removeStoredStarboardPost, setStarboardChannel as setChannel, setStarboardEmojis as setEmojis, setStarboardThreshold as setThreshold, update } from "../../database/guildData.js";
import { hasPermissions } from "../../utils/userUtils.js";
import { EmbedBuilder } from "@discordjs/builders";
import { BOT } from "../../index.js";
import { truncateString } from "../../utils/utils.js";
import { StarboardLeaderboard, StarboardPost } from "../../database/models/guildModel.js";
import { commandNotImplemented } from "../../utils/commandUtils.js";

const setStarboardChannel = async (interaction: any): Promise<string> => {
    // Check if user has permissions
    if ( !hasPermissions(PermissionsBitField.Flags.ManageGuild, interaction.guild, interaction.user) ) {
        return 'You must be a mod to use this command!';
    }

    const channel: Channel = interaction.options.getChannel('channel');
    var toReturn: string = "";
    if (!channel.isTextBased()) {
        toReturn = 'The starboard channel must be a valid text channel';
    } else {
        toReturn += await setChannel(interaction.guildId, channel.id);
    }

    return toReturn;
}

const setStarboardThreshold = async (interaction: any): Promise<string> => {
    // Check if user has permissions
    if ( !hasPermissions(PermissionsBitField.Flags.ManageGuild, interaction.guild, interaction.user) ) {
        return 'You must be a mod to use this command!';
    }

    const count: number = interaction.options.getInteger('count');
    var toReturn: string = "";
    if (count < 1) {
        toReturn = 'The starboard threshold must be greater than 0';
    } else {
        toReturn = await setThreshold(interaction.guildId, count);
    }
    return toReturn;
}

const setStarboardEmojis = async (interaction: any): Promise<string> => {
    // Check if user has permissions
    if ( !hasPermissions(PermissionsBitField.Flags.ManageGuild, interaction.guild, interaction.user) ) {
        return 'You must be a mod to use this command!';
    }

    if (!interaction.options.getString('emoji') && !interaction.options.getString('success')) {
        return 'You must provide at least one emoji';
    } else {
        return setEmojis(interaction.guildId, interaction.options.getString('emoji'), interaction.options.getString('success'));
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

const blacklistChannels = async (interaction: CommandInteraction) => {
    if ( !interaction.guild || !interaction.guildId || !interaction.channel ) { return; }
    // Check if user has permissions
    if ( !hasPermissions(PermissionsBitField.Flags.ManageGuild, interaction.guild, interaction.user) ) {
        await interaction.editReply('You must be a mod to use this command!');
        return;
    }

    const guildData = await getGuildDataByGuildID(interaction.guildId);
    let isBlacklistEnabled: boolean = guildData.starboard.blacklistEnabled;
    let isBlacklistChanged: boolean = false;
    const replyMessage = await interaction.editReply('This command lets you set a blacklist of channels that will not be scanned for starboard posts.');
    const filter = (reaction: any, user: any) => {
        return ['✅', '❌'].includes(reaction.emoji.name) && user.id === interaction.user.id;
    }
    if (!isBlacklistEnabled) {
        const replyMessage = await interaction.followUp({ content: 'Starboard channel blacklist is not enabled on this server. Would you like to enable it now? (React to respond)', fetchReply: true});
        replyMessage.react('✅');
        replyMessage.react('❌');
        const collector = replyMessage.createReactionCollector({ filter, time: 15000 });

        replyMessage.awaitReactions({ filter, time: 15000, errors: ['time'] }).catch((collected) => {
            
        });
        collector.on('collect', async (reaction, user) => {
            if (user != interaction.user) return;
            if (reaction.emoji.name === '✅') {
                await replyMessage.edit('Okay, starboard channel blacklist enabled.');
                await replyMessage.reactions.removeAll();
                isBlacklistChanged = true;
                await collector.stop();
                return;
            } else {
                await replyMessage.edit('Okay, starboard channel blacklist not enabled.');
                await replyMessage.reactions.removeAll();
                await collector.stop();
                return;
            }
        });
    }

    let removeChannels: boolean = false;
    if (isBlacklistEnabled || isBlacklistChanged) {
        const blacklistedChannels = guildData.starboard.blacklistChannels;
        let channelList = "";
        if (blacklistedChannels.length == 0) {
            channelList = "No channels are currently blacklisted.";
        } else {
            channelList = "The following channels are blacklisted:\n";
            for (const channelID of blacklistedChannels) {
                const channel = await BOT.channels.fetch(channelID);
                channelList += `<#${channelID}> `;
            }
            channelList += `\n\nWould you like to add (➕) or remove (➖) channels from the blacklist? (React to respond)`;
        }
        let replyMessage = await interaction.followUp({ content: channelList, fetchReply: true});
        // Only give option to remove if channels exist
        if (blacklistedChannels.length > 0) {
            replyMessage.react('➕');
            replyMessage.react('➖');

            const collector = replyMessage.createReactionCollector({ filter, time: 15000 });
            collector.on('collect', async (reaction, user) => {
                if (reaction.emoji.name === '✅') {
                    await replyMessage.edit("Cool. Mention the channels you want to remove from the blacklist and say 'DONE' when you're done.");
                    await replyMessage.reactions.removeAll();
                    removeChannels = true;
                    await collector.stop();
                } else {
                    await replyMessage.edit("Okay, mention all the channels you want to add to the blacklist and say 'DONE' when you're done.");
                    await replyMessage.reactions.removeAll();
                    await collector.stop();
                    return;
                }
            });
        } else {
            replyMessage = await interaction.followUp("Let's add some! Mention all the channels you want to add to the blacklist and say 'DONE' when you're done.");
        }
        // Collect responses from the user until they say 'DONE'
        const channelCollector = interaction.channel.createMessageCollector({ filter: (m: Message) => m.author.id === interaction.user.id });
        let channelMentions: Channel[] = new Array();
        channelCollector.on('collect', async (message: Message) => {
            if (message.content.toLowerCase() === 'done') {
                await channelCollector.stop();
                return;
            }
            // Handle case where multiple channels are in one message
            const mentions = message.mentions.channels;
            if (mentions.size == 0 || !mentions) {
                await interaction.followUp("That's not a valid channel. Try again or say 'DONE' to stop.");
                return;
            } else {
                for (const channel of mentions.values()) {
                    channelMentions.push(channel);
                }   
            }
        });

        if (channelMentions.length == 0) {
            await interaction.followUp("Hmm, you didn't mention any channels, so I'll stop listening for now.");
            return;
        } else {
            let feedback = "";
            if (removeChannels) {
                for (const channel of channelMentions) {
                    if (blacklistedChannels.includes(channel.id)) {
                        feedback += "<#" + channel.id + "> was removed successfully.\n";
                        blacklistedChannels.splice(blacklistedChannels.indexOf(channel.id), 1);
                    } else {
                        feedback += "<#" + channel.id + "> is not in the blacklist!\n";
                    }
                }
            } else {
                for (const channel of channelMentions) {
                    if (blacklistedChannels.includes(channel.id)) {
                        feedback += "<#" + channel.id + "> is already in the blacklist!\n";
                    } else {
                        feedback += "<#" + channel.id + "> was added successfully.\n";
                        blacklistedChannels.push(channel.id);
                    }
                }
            }
            guildData.starboard.blacklistChannels = blacklistedChannels;
            if ( guildData.starboard.blacklistChannels.length == 0 ) {
                feedback += "The blacklist is now empty, so I'll disable it.";
                guildData.starboard.blacklistEnabled = false;
            }
            await interaction.followUp(feedback);
        }

        if (isBlacklistChanged) guildData.starboard.blacklistEnabled = isBlacklistEnabled;
        try {
            update(guildData);
        } catch (error) {
            interaction.followUp(`ERROR: Could not update database.`);
            console.log(error);
        }
    }

}





export const starboard: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('starboard')
        .setDescription('Manage starboard settings for the server')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setchannel')
                .setDescription('Set the starboard channel')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('The channel to set as the starboard channel')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('threshold')   
                .setDescription('Set the starboard threshold')
                .addIntegerOption(option =>
                    option
                        .setName('count')
                        .setDescription('The number of stars required to be on the starboard')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('emoji')
                .setDescription('Set the starboard emoji(s)')
                .addStringOption(option =>
                    option
                        .setName('emoji')
                        .setDescription('The emoji to use for the starboard')
                )
                .addStringOption(option =>
                    option
                        .setName('success')
                        .setDescription('The emoji to react with when a message is successfully added to the starboard')
                )
        )
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
        .addSubcommand(subcommand =>
            subcommand
                .setName('blacklist')
                .setDescription('Set channels that will not be scanned for starboard posts')
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
            case 'setchannel':
                await interaction.editReply(await setStarboardChannel(interaction));
                break;
            case 'threshold':
                await interaction.editReply(await setStarboardThreshold(interaction));
                break;
            case 'emoji':
                await interaction.editReply(await setStarboardEmojis(interaction));
                break;
            case 'top':
                await interaction.editReply({ embeds: [await retrieveStarboardLeaderboard(interaction)] });
                break;
            case 'random':
                await retrieveRandomStarboardPost(interaction);
                break;
            case 'blacklist':
                commandNotImplemented(interaction, 'blacklist');
                //await blacklistChannels(interaction);
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
    }
}