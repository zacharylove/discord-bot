// Runs on every message
// Make sure bot has the correct scope and permissions!

import { areWordleFeaturesEnabled } from "../database/guildData";
import { Client, Message, GatewayIntentBits } from "discord.js";
import { EventInterface } from "interfaces/Event";
import { wordle } from "utils/wordleUtils";

export const onMessage : EventInterface = {
    run: async (Message: Message, WordleUtil: wordle) => {
        // Ignore messages from bots
        if (Message.author.bot) return;
        // Ignore messages in DMs
        if (!Message.guildId) return;

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