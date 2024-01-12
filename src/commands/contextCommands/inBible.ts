import { ApplicationCommandType, CommandInteraction, ContextMenuCommandBuilder } from "discord.js";
import { CommandInterface } from "../../interfaces/Command";
import { BOT } from "../../index.js";


export const inBible: CommandInterface = {
    data: new ContextMenuCommandBuilder()
    // How many of these words are in th
    // Are these words in the Bible?
        .setName('Are these words in the Bible?')
        .setType(ApplicationCommandType.Message)
    ,
    run: async (interaction: CommandInteraction) => {
        if (!interaction.isMessageContextMenuCommand()) return;
        await interaction.deferReply();

        const originalMessage = interaction.targetMessage.content;
        let message = originalMessage;

        // Strip punctuation, numbers, and emojis
        message = message.replace(/:[^:]*:/g, '');
        message = message.replace(/[^\p{L}\s]/gu, '');

        message = message.toLowerCase();

        if (message == "" || !message) {
            await interaction.editReply("There's no text to check here! The Bible isn't a picture book!");
            return;
        }

        const splitMessage = message.split(" ");
        const bibleAllWordList = BOT.getBibleAllWordList();
        const bibleUncommonWordList = BOT.getBibleUncommonWordList();
        let allCounter = 0;
        let uncommonCounter = 0;
        const notInBible = [];
        let addedToList: boolean;
        for (const word of splitMessage) {
            addedToList = false;
            
            console.debug(`bibleWordList[${word}] = ${bibleAllWordList.has(word)}`);
            if (bibleUncommonWordList.has(word)) {
                uncommonCounter++;
                notInBible.push(word);
                addedToList = true;
            }
            if (bibleAllWordList.has(word)) {
                allCounter++;
                if (!addedToList) notInBible.push(word + "\\*")
            }
            
        }

        let replyString = "";
        let allPercentage = (allCounter / splitMessage.length * 100).toFixed(2);
        let uncommonPercentage = (uncommonCounter / splitMessage.length * 100).toFixed(2);
        replyString += ` > <@${interaction.targetMessage.author.id}>:\n`;
        replyString += ` > "${originalMessage}"\n`;
        replyString += `**${allCounter == 0 ? "NONE" : `${allCounter}/${splitMessage.length}`}** of these words are in the Bible${allCounter != 0 ? ` (${allPercentage}%)` : ""}. `;
        if (allCounter != 0) replyString += `Not counting common words, **${uncommonCounter == 0 ? "NONE" : `${uncommonCounter}/${splitMessage.length}`}** of these words are in the Bible${uncommonCounter != 0 ? ` (${uncommonPercentage}%)` : ""}.`
        if (notInBible.length > 0) replyString += `**Words:** ${notInBible.join(", ")}\n`
        replyString += `\n*(Using the [King James Bible](https://www.o-bible.com/download/kjv.txt).${allCounter != 0 ? ` "Common words" are defined in a stopword list that contains conjunctions, negations, and modal verbs`: ""})*`;

        await interaction.editReply(replyString);
    },
    properties: {
        Name: 'In Bible',
        Scope: 'global',
        GuildOnly: false,
        Enabled: true,
        DefaultEnabled: true,
        Intents: [],
        Defer: false,
    }
}