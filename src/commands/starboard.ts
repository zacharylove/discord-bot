import { Channel, Embed, Message, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { CommandInterface } from "../interfaces/Command";
import { getGuildDataByGuildID, removeStoredStarboardPost, setStarboardChannel as setChannel, setStarboardEmojis as setEmojis, setStarboardThreshold as setThreshold } from "../database/guildData";
import { hasPermissions } from "../utils/userUtils";
import { EmbedBuilder } from "@discordjs/builders";
import { BOT } from "../index";
import { truncateString } from "../utils/utils";
import { StarboardLeaderboard, StarboardPost } from "../database/models/guildModel";

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
        const message = await channel.messages.fetch(post.messageID);
        if (!message) {
            await interaction.editReply("ERROR: Invalid message found.");
            removeStoredStarboardPost(interaction.guildId, post);
            continue;
        }
        valid = true;
    }
    await interaction.editReply({ content: `From <@${message.author.id}> - ${message.url}`,embeds: message.embeds });
}





export const starboard: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('starboard')
        .setDescription('Manage starboard settings for the server')
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
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
    ,
    run: async (interaction) => {
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
            case 'channel':
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