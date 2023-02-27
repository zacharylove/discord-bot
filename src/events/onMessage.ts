// Runs on every message
// Make sure bot has the correct scope and permissions!

import { Client, Message, GatewayIntentBits } from "discord.js";
import { EventInterface } from "interfaces/Event";
import { wordle } from "utils/wordleUtils";

export const onMessage : EventInterface = {
    run: async (Message: Message, WordleUtil: wordle) => {
        // Ignore messages from bots
        if (Message.author.bot) return;
        const messageContent = Message.content;
        
        console.debug(`Received message from ${Message.author.username}: ${messageContent}`);
    
        // Check if message is a wordle result
        WordleUtil.parseMessage(Message);
        
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