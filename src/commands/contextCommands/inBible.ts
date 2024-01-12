import { ApplicationCommandType, CommandInteraction, ContextMenuCommandBuilder } from "discord.js";
import { CommandInterface } from "../../interfaces/Command";
import { BOT } from "../../index.js";
import { truncateString } from "../../utils/utils.js";


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
        message = message.replace("\n", "");

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
        const notInBible = new Set();
        let addedToList: boolean;
        for (const word of splitMessage) {
            addedToList = false;
            
            if (bibleUncommonWordList.has(word)) {
                uncommonCounter++;
                notInBible.add(word);
                addedToList = true;
            }
            if (bibleAllWordList.has(word)) {
                allCounter++;
                if (!addedToList) notInBible.add(word + "\\*")
            }
            
        }

        let replyString = "";
        let allPercentage = (allCounter / splitMessage.length * 100).toFixed(2);
        let uncommonPercentage = (uncommonCounter / splitMessage.length * 100).toFixed(2);
        let notInBibleArray = Array.from(notInBible).slice(0,20);
        let isWordListTruncated = notInBibleArray.length < notInBible.size ? true : false;
        let originalMessageTruncated = truncateString(originalMessage, 1200).replaceAll("\n", "\n > ");
        let isStringTruncated = originalMessageTruncated.length < originalMessage.length ? true : false;
        replyString += ` > <@${interaction.targetMessage.author.id}>:\n`;
        replyString += ` > "${originalMessageTruncated}"\n`;
        replyString += `**${allCounter == 0 ? "NONE" : `${allCounter}/${splitMessage.length}`}** of these words are in the Bible${allCounter != 0 ? ` (${allPercentage}%)` : ""}. `;
        if (allCounter != 0) replyString += `Not counting common words, **${uncommonCounter == 0 ? "NONE" : `${uncommonCounter}/${splitMessage.length}`}** of these words are in the Bible${uncommonCounter != 0 ? ` (${uncommonPercentage}%)` : ""}.`
        replyString += `\n\n[Original Message](https://discord.com/channels/${interaction.guildId}/${interaction.targetMessage.channelId}/${interaction.targetMessage.id})`;
        if (notInBible.size > 0) {
            if (!isStringTruncated) {
                replyString += `\n**Words:** ${notInBibleArray.join(", ")}${isWordListTruncated ? "..." : ""}\n`
            } else {
                replyString += `\nThe original message is too long to display the list of words.`;
            }
        }
        replyString += `\n*(Using the [King James Bible](https://www.o-bible.com/download/kjv.txt).${allCounter != 0 ? ` "Common words" are defined in a stopword list that contains conjunctions, negations, and modal verbs`: ""})*`;

        if (replyString.length > 2000) {
            await interaction.editReply("My reply message is over 2000 characters in length and can't be sent! Contact inco for a fix.")
        } else {
            await interaction.editReply(replyString);
        }
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