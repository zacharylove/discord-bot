import { CommandInteraction, Message, PermissionsBitField, TextChannel, ThreadChannel } from 'discord.js';
import { CommandInterface, Feature } from '../../../interfaces/Command.js';
import { EmbedBuilder, SlashCommandBuilder } from "@discordjs/builders";
import * as fs from 'fs';
import path from 'path'
import { secondsToTimestamp } from '../../../utils/utils.js';
import { BOT } from '../../../index.js';
import { addThread, removeThread } from '../../../database/internalData.js';

const deleteThread = async (threadChannel: ThreadChannel) => {
    console.debug(`Removed thread ${threadChannel.id} from internal data.`)
    await removeThread(threadChannel.id);
    await threadChannel.delete();
}

const createSolutionLineString = (word: string) => {
    let out = "";
    for (const letter of word) {
        if (letter == " ") out += ":black_large_square: ";
        else out += `:regional_indicator_${letter}: `;
    }
    return out;
}

interface guesses {
    guess: string,
    authorName?: string,
    authorID?: string
}

const createWordleGrid = (word: string, guesses: guesses[], isInfinite: boolean, isPublic: boolean, showSolution?: boolean) => {
    showSolution = showSolution ?? false;
    let moreThanTen: number = 0;
    // Crop guesses to the last 10 if there are more than 10
    if (guesses.length > 10) {
        moreThanTen = guesses.length - 10;
        guesses = guesses.slice(guesses.length - 10);
    }

    let grid: string[][] = [];
    for (let i = 0; i < (isInfinite ? guesses.length + 1 : 6); i++) {
        grid.push([]);
        if (!showSolution) {
            for (let j = 0; j < 5; j++) {
                grid[i].push("⬜");
            }
        }
    }
    // Fill in guess letters
    let wordAsArray: string[] = Array.from(word);
    let partialSolutionMessage: string[] = [" ", " ", " ", " ", " "];
    for (let i = 0; i < guesses.length; i++) {
        let includeWord = wordAsArray.slice();
        let guess = guesses[i].guess;
        let authorName = guesses[i].authorName;
        let authorID = guesses[i].authorID;
        for (let j = 0; j < guess.length; j++) {
            if (guess[j] == word[j]) {
                grid[i][j] = "🟩";
                partialSolutionMessage[j] = guess[j];
                includeWord[j] = " ";
            } 
        }
        for (let j = 0; j < guess.length; j++) {    
            for ( let k = 0; k < word.length; k++) {
                if (guess[j] == includeWord[k] && grid[i][j] != "🟩") {
                    grid[i][j] = "🟨";
                    includeWord[k] = " ";
                    break;
                }
            }
            if (grid[i][j] != "🟨" && grid[i][j] != "🟩") grid[i][j] = "⬛";
        }
        
    }
    // Convert grid to string
    let gridString = isInfinite && moreThanTen > 0 ? `:::::::::::::::::::::::::::::: | (${moreThanTen} more)\n` : ``;
    for (let i = 0; i < grid.length; i++) {
        gridString += grid[i].join(" ");
        gridString += `${guesses.length > i ? " | " + guesses[i].guess + `${isPublic && guesses[i].authorName ? ` (${guesses[i].authorName})` : "" }`: ""}`;
        if (grid[i].length > 0) gridString += "\n";
    }
    gridString += showSolution ? createSolutionLineString(word) : createSolutionLineString(partialSolutionMessage.join(""));
    return gridString;
}

const createWordleGame = async (interaction: CommandInteraction, threadChannel: ThreadChannel, isPublic: boolean, isInfinite: boolean, isSilent: boolean, isChallenge: boolean, puzzlenum:number, username: string, userID: string) => {
    
    const validGuesses: string[] = BOT.getWordleAllowedGuessList();
    
    
    // Load word list
    
    let wordList: string[] = isChallenge ? BOT.getWordleChallengeWordList() : BOT.getWordleWordList();
    // Select a random 5-letter word
    let num: number;
    if (puzzlenum == -1) {
        num = Math.floor(Math.random() * wordList.length);
    } else if (puzzlenum < 1 || puzzlenum > wordList.length) {
        await interaction.editReply({ content: "Invalid puzzle number!" });
        await deleteThread(threadChannel);
        return;
    } else {
        num = puzzlenum - 1;
    }
    await interaction.editReply({ content: `Currently playing ${isChallenge ? "**Challenge** " : ""}#${num+1}${isInfinite ? " in infinite mode" : ""}${isPublic ? " - anyone can join and play!" : ""}`})
    let word: string = wordList[num];

    // Number of guesses, max 6
    let guesses = 0;

    // Create a new EmbedBuilder
    const wordleEmbed = new EmbedBuilder()
        .setTitle(`Wordle #${num+1}${isInfinite ? " (Infinite)" : ""}${isPublic ? " (Public)" : ""}${isChallenge ? "(🔥 Challenge)" : ""}`)
        .setDescription(createWordleGrid(word, [], isInfinite, isPublic))
        .setColor(0x00ff00)
        .setFooter({text: `${isInfinite ? "You got this." : `You have 6 guesses remaining`}`});
    // Send the embed
    await threadChannel.send({ embeds: [wordleEmbed] });
    // Filter messages for 5-letter words or 'stop' sent by original author
    const filter = (m: Message) => ((m.author.id === userID) || isPublic) && (m.content.length == 5 || m.content.toLowerCase() == "stop");
    const collector = threadChannel.createMessageCollector({ 
        filter: filter, 
        time: 600000,
        max: 100 
    });
    const collectorEndTime = Date.now() + 600000;

    let guessedWords: guesses[] = []
    let invalidLetters = new Set<string>();
    let validLetters = new Set<string>();
    let endMessage = isInfinite ? `The game has ended- ${username} ran out of time! The word was ${word}.` : "My message collector stopped- either something went wrong or you took over 10 minutes to play this game.";
    // Listen for messages
    collector.on('collect', async (m: Message) => {
        if (m.content.toLowerCase() == "stop") {
            await m.reply({ content: "Okay! Stopping the game." });
            endMessage = `The game was stopped by ${m.author.username}.`;
            collector.stop();
            return;
        }
        // Ensure only letters are guessed
        let regex = /^[a-zA-Z]+$/;
        if (!regex.test(m.content)) {
            await m.reply({ content: "Not a valid guess- only letters are allowed!" });
            return;
        }

        // Ensure guess is in validWordleGuesses
        if (!validGuesses.includes(m.content.toLowerCase())) {
            await m.reply({ content: "Not a valid word- please try again!" });
            return;
        }
        

        guesses++;
        let guess = m.content.toLowerCase();
        guessedWords.push({
            guess,
            authorName: m.author.username,
            authorID: m.author.id
        });
        let gridString = createWordleGrid(word, guessedWords, isInfinite, isPublic);
        if (guess == word) {
            await m.reply({ content: `You guessed the word! Congratulations!`});
            endMessage = `The game has ended${ isPublic ? `- ${m.author.username} guessed the word!` : "."}`;
            endMessage += `\n Wordle ${isChallenge ? "**Challenge** " : ""}#${num+1} ${guesses}/${isInfinite ? "infinite" : "6"}`;
            endMessage += `\n${createWordleGrid(word, guessedWords, isInfinite, isPublic, true)}`
            collector.stop();
            return;
        }
        if (!isInfinite && guesses >= 6) {
            await m.reply({ content: `You ran out of guesses! The word was ${word}. Better luck next time!`});
            endMessage = `The game has ended${ isPublic ? `- ${m.author.username} ran out of guesses!` : "."}`;
            endMessage += `\n${createWordleGrid(word, guessedWords, isInfinite, isPublic, true)}`
            collector.stop();
            return;
        }
        
        // Fill invalid letters and valid letters
        for (let j = 0; j < guess.length; j++) {
            if (guess[j] != word[j] && !word.includes(guess[j])) {
                invalidLetters.add(guess[j]);
            } else {
                validLetters.add(guess[j]);
            }
        }
        let fields = []
        if (invalidLetters.size > 0) {
            fields.push({
                name: "Invalid Letters",
                value: Array.from(invalidLetters).sort().join(", ")
            });
        }
        if (validLetters.size > 0) {
            fields.push({
                name: "Valid Letters",
                value: Array.from(validLetters).sort().join(", ")
            });
        }

        wordleEmbed.setFields(fields);
        // Fill valid letters
        process.env.DEBUG_MODE == "true" ? gridString += `\nDEBUG: word is "${word}"` : null;

        


        wordleEmbed.setDescription(gridString);
        wordleEmbed.setFooter({text: `${isInfinite ? `You have ${await secondsToTimestamp((collectorEndTime - Date.now()) / 1000, true)} remaining. Say 'stop' to end at any time.` : `You have ${6-guesses} guesses remaining`}`});
        await m.reply({ embeds: [wordleEmbed], allowedMentions: { repliedUser: false } });
    });

    collector.on('end', async (collected) => {
        // After the game ends, wait 10 seconds and then delete the thread
        setTimeout(async () => {
            await deleteThread(threadChannel);
        }, 10000);
        try {
            if (!isSilent) {
                await interaction.editReply({ content: endMessage });
            } else {
                await interaction.deleteReply();
            }
        } catch (e) {
            console.error(e);
        }
    });
}

export const playWordle: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('playwordle')
        .setDescription("Creates a new game of Wordle in a thread")
        .addBooleanOption(option =>
            option
                .setName('public')
                .setDescription('Allow anyone to guess')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('infinite')
                .setDescription('Infinite guess mode')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option
                .setName('puzzlenum')
                .setDescription('Specify a puzzle number to play')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option
                .setName('silent')
                .setDescription('Do not send score in chat when finished')
                .setRequired(false)
            )
        .addBooleanOption(option =>
            option
                .setName('challenge')
                .setDescription('Play in challenge mode')
                .setRequired(false)
            )
        ,
    run: async (interaction: CommandInteraction) => {
        if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.guild || !interaction.channel ) return;
        if (interaction.guild.members.me!.permissions.has(PermissionsBitField.Flags.ManageThreads) == false ||
        interaction.guild.members.me!.permissions.has(PermissionsBitField.Flags.SendMessagesInThreads) == false) {
            await interaction.editReply({ content: "I don't have permission to create threads! Please ask a server admin to enable this permission for me." });
            return;
        }

        if (interaction.guild.members.me!.permissions.has(PermissionsBitField.Flags.ManageMessages) == false) {
            await interaction.editReply({ content: "I don't have permission to delete messages! I need this in order to delete the thread created for the game." });
            return;
        }
        const replyMessage: Message = await interaction.editReply("Creating a new game of Wordle...");

        const isPublic: boolean = await interaction.options.getBoolean('public') ?? false;
        const isInfinite: boolean = await interaction.options.getBoolean('infinite') ?? false;
        const puzzlenum: number = await interaction.options.getInteger('puzzlenum') ?? -1;
        const isSilent: boolean = await interaction.options.getBoolean('silent') ?? false;
        const isChallenge: boolean = await interaction.options.getBoolean('challenge') ?? false;

        const numTotalPuzzles = BOT.getWordleWordList().length;
        if (puzzlenum != -1 && (puzzlenum < 1 || puzzlenum > BOT.getWordleWordList().length)) {
            await interaction.editReply({ content: `Invalid puzzle number! Pick a number between 1 and ${numTotalPuzzles}.` });
            return;
        }

        const channel = await interaction.channel.fetch();
        // get original Message from interaction
        
        // get username of user who sent the command
        const username = await interaction.user.username;
        const userID = await interaction.user.id;
        // If channel is a GuildTextBasedChannel channel
        if (channel.isTextBased() && channel instanceof TextChannel) {
            try {
                const threadChannel = await replyMessage.startThread({
                    name: `${username}-wordle`,
                    autoArchiveDuration: 60,
                    reason: `${username}'s game of wordle!`,
                });
                console.debug(`Added thread ${threadChannel.id} to internal data.`);
                await addThread(threadChannel.id, channel.id, "wordle");
                let startMessage = `**Let's play a game of Wordle!**\n > Wordle is a daily word game where players have ${isInfinite ? "~~six~~ *infinite*" : "six"} attempts to guess a five letter word. Feedback for each guess is given in the form of colored tiles to indicate if letters match the correct position.`;
                startMessage += `\n - You can send guesses as messages in this thread. I'll ignore any messages that aren't 5-letter words.`;
                if (isPublic) startMessage += `\n - This game is **public**: anyone can make guesses in this thread!`;
                else startMessage += `\n - Only <@${userID}> will be able to make guesses.`;
                if (isInfinite) startMessage += `\n - This game is **infinite**: you have infinite guesses within 10 minutes until you get the word!`;
                if (isSilent) startMessage += `\n - This game is **silent**: the final score will not be sent to chat and the starting message will be deleted after the game ends.`;
                if (isChallenge) startMessage += `\n - This game is in **challenge mode**: the word will be selected from the *entire* US dictionary and can be very difficult to guess!`;
                startMessage += `\n - You can say "stop" at any time to end the game early, and the thread will be deleted after the game ends.`;

                
                startMessage += `\nGood luck!`;

                // Add the user
                try {
                    await threadChannel.members.add(userID);
                } catch (e) {
                    await interaction.editReply({ content: "An error occurred adding you to the thread." });
                    await deleteThread(threadChannel);
                    console.error(e);
                    return;
                }
                await threadChannel.send({ content: startMessage});

                await createWordleGame(interaction, threadChannel, isPublic, isInfinite, isSilent, isChallenge, puzzlenum, username, userID);
                return;
            } catch (e) {
                await interaction.editReply({ content: "Something went horribly wrong behind the scenes here... "});
            }
        }
        await interaction.editReply({ content: "Sorry, I can only create new threads in a regular text channel!" });
        
    },
    properties:  {
        Name: 'Play Wordle',
        Scope: 'global',
        GuildOnly: false,
        Enabled: true,
        DefaultEnabled: true,
        Intents: [],
        Permissions: [],
        Feature: Feature.Wordle
    }
}