// Per-Server configuration
import { Document, model, Schema } from 'mongoose';
import { CommandInterface } from "../../interfaces/Command.js";
// @ts-ignore
import { default as config } from "../../config/config.json" assert { type: "json" };
const starboardConfig = config.starboard.config;

export interface GuildDataInterface extends Document {
    _id: String;
    registeredAt: Date;
    updatedAt?: Date;
    commands: {
        enabledCommands: string[];
        disabledCommands: string[];
    }
    messageScanning: {
        wordleResultScanning: boolean;
        starboardScanning: boolean;
        twitterEmbedFix: boolean;
        tiktokEmbedFix: boolean;
        instagramEmbedFix: boolean;
    },
    channels: {
        confessionChannelId: string;
        starboardChannelId: string;
        qotdChannelId: string;
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
    }
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
        enabledCommands: new Array<CommandInterface>(),

        // Disabled commands
        // Commands that are enabled by default but disabled in this guild
        disabledCommands: new Array<CommandInterface>(),
    },

    // Message scanning settings
    messageScanning: {
        wordleResultScanning: Boolean,
        starboardScanning: Boolean,
        twitterEnbedFix: Boolean,
        instagramEmbedFix: Boolean,
    },

    // Channels for features
    channels: {
        confessionChannelId: String,
        starboardChannelId: String,
        qotdChannelId: String,
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
    }
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
        registeredAt: new Date(),
        updatedAt: new Date(),
        commands: {
            enabledCommands: new Array<string>(),
            disabledCommands: new Array<string>(),
        },
        messageScanning: {
            // Wordle scanning is disabled by default
            wordleResultScanning: false,
            starboardScanning: false,
            // Twitter embed fix is enabled by default (until they get their act together)
            twitterEmbedFix: true,
            tiktokEmbedFix: true,
            instagramEmbedFix: true
        },
        channels: {
            confessionChannelId: "",
            starboardChannelId: "",
            qotdChannelId: "",
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
        }
    });
}

const guildModel = model<GuildDataInterface>('GuildData', GuildData, "guilds");
export default guildModel;