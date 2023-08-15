import { Channel, EmbedBuilder, GatewayIntentBits, Message, MessageManager, MessageReaction, Partials, TextChannel, User } from "discord.js";
import { EventInterface } from "interfaces/Event";
import { parseStarReact } from "../utils/starboardUtils";




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

        // Starboard
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