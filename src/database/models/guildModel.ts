// Per-Server configuration
import { Document, model, Schema } from 'mongoose';
import { CommandInterface } from "../../interfaces/Command.js";
// @ts-ignore
import { default as config } from "../../config/config.json" assert { type: "json" };
import { getCurrentUTCDate }from '../../utils/utils.js';
const starboardConfig = config.starboard.config;

export interface GuildDataInterface extends Document {
    _id: String;
    registeredAt: Date;
    updatedAt?: Date;
    commands: {
        enabledCommands: string[];
        disabledCommands: string[];
        commandLog: CommandLog[]
    }
    messageScanning: {
        wordleResultScanning: boolean;
        starboardScanning: boolean;
        twitterEmbedFix: boolean;
        tiktokEmbedFix: boolean;
        instagramEmbedFix: boolean;
        customResponse: boolean;
    },
    channels: {
        confessionChannelId: string;
        confessionApprovalChannelId: string;
        starboardChannelId: string;
        qotdChannelId: string;
    },
    confession: {
        approvalQueue: Map<String, Confession>;
    },
    starboard: {
        emoji: string;
        threshold: number;
        successEmoji: string;
        leaderboard: StarboardLeaderboard[];
        posts: StarboardPost[];
        blacklistEnabled: boolean,
        blacklistChannels: string[];
    }
    counters: {
        numConfessions: number;
        numStarboardPosts: number;
        numQotdPosts: number;
    },
    qotd: {
        qotdWhitelist: boolean,
        whitelistedRoleIds: string[],
        qotdRole: string,
    },
    customResponses: {
        name: string;
        enabled: boolean;
        trigger: string;
        response: string;
        regex: boolean;
        reply: boolean;
        channelId: string | null;
        allowPing: boolean;
        fullMessage: boolean;
    }[]
}

export interface StarboardPost {
    messageID: string;
    channelID: string;
}

export interface StarboardLeaderboard {
    messageID: string;
    channelID: string;
    originalMessageID: string;
    originalChannelID: string;
    timestamp: Date;
    authorID: string;
    numReactions: number;
}

export interface CommandLog {
    commandName: string;
    displayName: string;
    arguments: string[];
    callingUserId: string;
    channelId: string;
    timestamp: Date;
}

export interface Confession {
    userId: string;
    message: string;
    imageURL?: string;
    mentionedUserId?: string;
    timestamp: Date;
}

export const GuildData = new Schema({
    // Guild ID
    _id: String,
    // When the guild was registered to the database
    registeredAt: Date,
    // When the guild was last updated
    updatedAt: Date,

    // Command settings
    // Each command is represented by its exported CommandInterface object
    commands: {
        // Enabled commands 
        // Commands that are disabled by default but enabled in this guild
        enabledCommands: new Array<String>(),

        // Disabled commands
        // Commands that are enabled by default but disabled in this guild
        disabledCommands: new Array<String>(),

        commandLog: new Array<CommandLog>(),
    },

    // Message scanning settings
    messageScanning: {
        wordleResultScanning: Boolean,
        starboardScanning: Boolean,
        twitterEmbedFix: Boolean,
        instagramEmbedFix: Boolean,
        customResponse: Boolean,
    },

    // Channels for features
    channels: {
        confessionChannelId: String,
        confessionApprovalChannelId: String,
        starboardChannelId: String,
        qotdChannelId: String,
    },
    confession: {
        approvalQueue: {
            type: Map,
            of: Object
        },
    },
    // Starboard settings
    starboard: {
        emoji: String,
        threshold: Number,
        successEmoji: String,
        leaderboard: new Array(),
        numReactions: Number,
        posts: new Array(),
        blacklistEnabled: Boolean,
        blacklistChannels: new Array(),
    },

    // Counters for the current guild
    counters: {
        numConfessions: Number,
        numStarboardPosts: Number,
        numQotdPosts: Number,
    },
    qotd: {
        qotdWhitelist: Boolean,
        whitelistedRoleIds: new Array(),
        qotdRole: String,
    },
    customResponses: new Array()
});

/**
 * Creates and returns an empty GuildData object
 * @param guildID 
 * @returns 
 */
export const createNewGuildData = async (guildID: string) => {
    console.log(`Creating new GuildData object for guild ${guildID}...`)
    return guildModel.create({
        _id: guildID,
        registeredAt: getCurrentUTCDate(),
        updatedAt: getCurrentUTCDate(),
        commands: {
            enabledCommands: new Array<string>(),
            disabledCommands: new Array<string>(),
            commandLog: new Array<CommandLog>(),
        },
        messageScanning: {
            // Wordle scanning is disabled by default
            wordleResultScanning: false,
            starboardScanning: false,
            // Disabled twitter/insta embed fix by default
            twitterEmbedFix: false,
            tiktokEmbedFix: true,
            instagramEmbedFix: false,
            customResponse: true,
        },
        channels: {
            confessionChannelId: "",
            confessionApprovalChannelId: "",
            starboardChannelId: "",
            qotdChannelId: "",
        },
        confession: {
            approvalQueue: new Map<String, Confession>(),
        },
        starboard: {
            emoji: starboardConfig.defaultEmoji,
            threshold: starboardConfig.defaultThreshold,
            successEmoji: starboardConfig.defaultSuccessEmoji,
            leaderboard: new Array({
                messageID: String,
                channelID: String,
                originalMessageID: String,
                originalChannelID: String,
                timestamp: new Date(),
                authorID: String,
                numReactions: 0,
            }),
            posts: new Array({
                messageID: String,
                channelID: String,
            }),
            blacklistEnabled: false,
            blacklistChannels: new Array(),
        },
        counters: {
            numConfessions: 1,
            numStarboardPosts: 1,
            numQotdPosts: 1,
        },
        qotd: {
            qotdWhitelist: false,
            whitelistedRoleIds: new Array(),
            qotdRole: ""
        },
        customResponses: new Array(),
    });
}

const guildModel = model<GuildDataInterface>('GuildData', GuildData, "guilds");
export default guildModel;