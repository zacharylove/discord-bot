// Runs on every message
// Make sure bot has the correct scope and permissions!

import { areWordleFeaturesEnabled } from "../database/guildData";
import { Client, Message, GatewayIntentBits, TextChannel, DMChannel } from "discord.js";
import { EventInterface } from "interfaces/Event";
import { wordle } from "utils/wordleUtils";

const sayCommand = async (Message: Message) => {

}

export const onMessage : EventInterface = {
    run: async (Message: Message, WordleUtil: wordle, BOT: Client) => {
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
            }
        }

        // Ignore messages in DMs
        if (!Message.guildId) {
            return;
        }

        const messageContent = Message.content;
        
        
    
        // Check if message is a wordle result
        if (await areWordleFeaturesEnabled(Message.guildId)) WordleUtil.parseMessage(Message);
        
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