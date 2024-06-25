import { MessageReaction, Partials, User } from "discord.js";
import { GatewayIntentBits } from "discord-api-types/v10";
import { EventInterface } from "../interfaces/Event.js";
import { parseStarReact } from "../utils/starboardUtils.js";




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

        // Starboard
        try {
            await parseStarReact(reaction, user, true);
        } catch (e) {
            console.error(`Error in parseStarReact: ${e}`);
            return;
        }

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

        // Starboard
        try {
            await parseStarReact(reaction, user, false);
        } catch (e) {
            console.error(`Error in parseStarReact: ${e}`);
            return;
        }

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