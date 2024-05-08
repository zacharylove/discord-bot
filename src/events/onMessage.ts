// Runs on every message
// Make sure bot has the correct scope and permissions!

import Bot from "../bot";
import { areWordleFeaturesEnabled, getGuildDataByGuildID, isInstagramEmbedFixEnabled, isTikTokEmbedFixEnabled, isTwitterEmbedFixEnabled } from "../database/guildData.js";
import { Message, GatewayIntentBits, TextChannel, DMChannel } from "discord.js";
import { EventInterface } from "../interfaces/Event.js";
import { parseManyURLs, validURL } from "../utils/utils.js";
import { twitterEmbedFix } from "./responses/twitterEmbedFix.js";
import { tikTokEmbedFix } from "./responses/tiktokEmbedFix.js";
import { instagramEmbedFix } from "./responses/instagramEmbedFix.js";

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
                // Check whether it's a "reply" command
                // reply (channel) (message id) (message)
                if (Message.content.startsWith('reply')) {
                    const splitMsg = Message.content.split(' ');
                    if (splitMsg.length > 3) {
                        const channelId: string = splitMsg[1];
                        const messageId: string = splitMsg[2];
                        const message: string = splitMsg.slice(3).join(' ');
                        const channel = await BOT.channels.cache.get(channelId);
                        if (channel && channel.isTextBased()) {
                            const srcMessage = await (<TextChannel> channel).messages.fetch(messageId);
                            if (srcMessage) {
                                await srcMessage.reply(message);
                            }
                            console.log('Replying to message message ' + messageId + ' in channel ' + channelId + ': ' + message);
                        }
                    }
                }
            }
        }

        // Ignore messages in DMs
        if (!Message.guildId) {
            return;
        }
        
        
        const guildData = await getGuildDataByGuildID(Message.guildId);
        // Check if message is a game result
        if (await areWordleFeaturesEnabled(guildData)) {
            BOT.getWordleUtil().parseMessage(Message);
            BOT.getTradleUtil().parseMessage(Message);
            BOT.getConnectionsUtil().parseMessage(Message);
        }

        // Check if message contains a valid URL
        const messageURLS: string[] = parseManyURLs(Message.content);
        if (messageURLS.length > 0) {
            if (await isTwitterEmbedFixEnabled(guildData)) await twitterEmbedFix(Message, messageURLS);
            if (await isTikTokEmbedFixEnabled(guildData)) await tikTokEmbedFix(Message, messageURLS);
            if (await isInstagramEmbedFixEnabled(guildData)) await instagramEmbedFix(Message, messageURLS);
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