// Per-Server configuration
import { Document, model, ObjectId, Schema, Types } from 'mongoose';

import { CommandList } from 'commands/_CommandList';
import { CommandInterface } from "../../interfaces/Command";

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
    },
    channels: {
        confessionChannelId: string;
        starboardChannelId: string;
    },
    counters: {
        numConfessions: number;
    }
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
    },

    // Channels for features
    channels: {
        confessionChannelId: String,
        starboardChannelId: String,
    },

    // Counters for the current guild
    counters: {
        numConfessions: Number,
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
        },
        channels: {
            confessionChannelId: "",
            starboardChannelId: "",
        },
        counters: {
            numConfessions: 1,
        }
    });
}

const guildModel = model<GuildDataInterface>('GuildData', GuildData, "guilds");
export default guildModel;