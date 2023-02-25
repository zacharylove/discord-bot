// Runs on every message
// Make sure bot has the correct scope and permissions!

import { Client, Message } from "discord.js";
import { wordle } from "utils/wordleUtils";

export const onMessage = async (Message: Message, WordleUtil: wordle) => {
    // Ignore messages from bots
    if (Message.author.bot) return;
    const messageContent = Message.content;
    
    console.debug(`Received message from ${Message.author.username}: ${messageContent}`);

    // Check if message is a wordle result
    WordleUtil.parseMessage(Message);
    
}