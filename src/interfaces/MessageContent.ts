import { Snowflake } from "discord.js";

// Because discord js has like 8 different classes for emojis
export interface MessageEmoji {
    animated: boolean | null;
    unicode: boolean;
    name: string;
    id?: Snowflake;
    imageUrl?: string;
    createdAt?: Date;
    createdTimestamp?: number;
}