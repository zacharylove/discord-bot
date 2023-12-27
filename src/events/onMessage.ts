// Runs on every message
// Make sure bot has the correct scope and permissions!

import Bot from "../bot";
import { areWordleFeaturesEnabled, isTikTokEmbedFixEnabled, isTwitterEmbedFixEnabled } from "../database/guildData.js";
import { Message, GatewayIntentBits, TextChannel, DMChannel } from "discord.js";
import { EventInterface } from "../interfaces/Event.js";
import { parseManyURLs, validURL } from "../utils/utils.js";
import { twitterEmbedFix } from "./responses/twitterEmbedFix.js";
import { tikTokEmbedFix } from "./responses/tiktokEmbedFix.js";

const sayCommand = async (Message: Message) => {

}

export const onMessage : EventInterface = {
    run: async (Message: Message, BOT: Bot) => {
        // Ignore messages from bots
        if (Message.author.bot) return;
        if (Message.channel instanceof DMChannel) {
            console.log('Received message from ' + Message.author.username + ' in DMs: ' + Message.content)
            // Unless it's from the bot owner (that's me)
            if (Message.author.id == process.env.OWNER_ID) {
                console.log('Received message from bot owner')
                // Then check whether it's a "say" command
                if (Message.content.startsWith('say ')) {
                    const splitMsg = Message.content.split(' ');
                    if (splitMsg.length > 2) {
                        const channelId: string = splitMsg[1];
                        const message: string = splitMsg.slice(2).join(' ');
                        const channel = await BOT.channels.cache.get(channelId);
                        if (channel && channel.isTextBased()) {
                            console.log('Sending message to channel ' + channelId + ': ' + message);
                            (<TextChannel> channel).send(message);
                        }
                        
                    }    
                }
                // Check whether it's a "kill" command
                if (Message.content.startsWith('kill')) {
                    console.log('Received kill command from bot owner')
                    BOT.destroy();
                    process.exit(0);
                }
            }
        }

        // Ignore messages in DMs
        if (!Message.guildId) {
            return;
        }
        
        
    
        // Check if message is a wordle result
        if (await areWordleFeaturesEnabled(Message.guildId)) {
            BOT.getWordleUtil().parseMessage(Message);
            BOT.getTradleUtil().parseMessage(Message);
        }

        // Check if message contains a valid URL
        const messageURLS: string[] = parseManyURLs(Message.content);
        if (messageURLS.length > 0) {
            if (await isTwitterEmbedFixEnabled(Message.guildId)) await twitterEmbedFix(Message, messageURLS);
            if (await isTikTokEmbedFixEnabled(Message.guildId)) await tikTokEmbedFix(Message, messageURLS);
        }

        
    },
    properties: {
        Name: "messageCreate",
        Enabled: true,
        Intents: [
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMessages,
        ]
    }
}