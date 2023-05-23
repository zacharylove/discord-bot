// General-purpose utility functions

import { GatewayIntentBits } from "discord.js";

export const toTitleCase = (text: string): string => {
    return text.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

export const intentEnumToString = ( intent: GatewayIntentBits ): string => {
    switch ( intent ) {
        case GatewayIntentBits.Guilds: return "Guilds";
        case GatewayIntentBits.GuildMembers: return "GuildMembers";
        case GatewayIntentBits.GuildModeration: return "GuildModeration";
        case GatewayIntentBits.GuildBans: return "GuildBans";
        case GatewayIntentBits.GuildEmojisAndStickers: return "GuildEmojisAndStickers";
        case GatewayIntentBits.GuildIntegrations: return "GuildIntegrations";
        case GatewayIntentBits.GuildWebhooks: return "GuildWebhooks";
        case GatewayIntentBits.GuildInvites: return "GuildInvites";
        case GatewayIntentBits.GuildVoiceStates: return "GuildVoiceStates";
        case GatewayIntentBits.GuildPresences: return "GuildPresences";
        case GatewayIntentBits.GuildMessages: return "GuildMessages";
        case GatewayIntentBits.GuildMessageReactions: return "GuildMessageReactions";
        case GatewayIntentBits.GuildMessageTyping: return "GuildMessageTyping";
        case GatewayIntentBits.DirectMessages: return "DirectMessages";
        case GatewayIntentBits.DirectMessageReactions: return "DirectMessageReactions";
        case GatewayIntentBits.DirectMessageTyping: return "DirectMessageTyping";
        case GatewayIntentBits.MessageContent: return "MessageContent";
        case GatewayIntentBits.GuildScheduledEvents: return "GuildScheduledEvents";
        case GatewayIntentBits.AutoModerationConfiguration: return "AutoModerationConfiguration";
        case GatewayIntentBits.AutoModerationExecution: return "AutoModerationExecution";
        default: return "Unknown Intent!";
    }
}