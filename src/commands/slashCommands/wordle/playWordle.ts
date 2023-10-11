import { CommandInteraction, Message, TextChannel, ThreadChannel } from 'discord.js';
import { CommandInterface, Feature } from '../../../interfaces/Command.js';
import { EmbedBuilder, SlashCommandBuilder } from "@discordjs/builders";
import * as fs from 'fs';
import path from 'path'
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const createWordleGrid = (word: string, guesses: string[], isInfinite: boolean) => {
    // Crop guesses to the last 10 if there are more than 10
    if (guesses.length > 10) {
        guesses = guesses.slice(guesses.length - 10);
    }

    let grid: string[][] = [];
    for (let i = 0; i < (isInfinite ? guesses.length + 1 : 6); i++) {
        grid.push([]);
        for (let j = 0; j < 5; j++) {
            grid[i].push("⬜");
        }
    }
    // Fill in guess letters
    for (let i = 0; i < guesses.length; i++) {
        let guess = guesses[i];
        for (let j = 0; j < guess.length; j++) {
            if (guess[j] == word[j]) {
                grid[i][j] = "🟩";
            } else if (word.includes(guess[j])) {
                grid[i][j] = "🟨";
            } else {
                grid[i][j] = "🟥";
            }
        }
    }
    // Convert grid to string
    let gridString = ``;
    for (let i = 0; i < grid.length; i++) {
        gridString += grid[i].join(" ");
        gridString += `${guesses.length > i ? " | " + guesses[i] : ""}`;
        gridString += "\n";
    }
    return gridString;
}

const createWordleGame = async (interaction: CommandInteraction, threadChannel: ThreadChannel, isPublic: boolean, isInfinite: boolean) => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    // Load valid wordle guesses
    //let validGuessesString: string = fs.readFileSync(path.resolve(path.join(__dirname, '..', '..', '..', '..', 'assets', 'txt', 'validWordleGuesses.txt')),'utf8');
    //const validGuesses: string[] = validGuessesString.split('\n');
    
    
    // Load word list
    
    let wordString: string = fs.readFileSync(path.resolve(path.join(__dirname, '..', '..', '..', '..', 'assets', 'txt', 'wordleWords.txt')),'utf8');
    let wordList: string[] = wordString.split('\n');
    // Select a random 5-letter word
    const num = Math.floor(Math.random() * wordList.length);
    interaction.editReply({ content: `Currently playing #${num+1}${isInfinite ? " in infinite mode" : ""}${isPublic ? " - anyone can join and play!" : ""}`})
    let word: string = wordList[num];

    // Number of guesses, max 6
    let guesses = 0;

    // Create a new EmbedBuilder
    const wordleEmbed = new EmbedBuilder()
        .setTitle(`Wordle #${num+1}${isInfinite ? " (Infinite)" : ""}${isPublic ? " (Public)" : ""}}}`)
        .setDescription(createWordleGrid(word, [], isInfinite))
        .setColor(0x00ff00)
        .setFooter({text: `${isInfinite ? "Keep guessing, you have all the time in the world." : `You have 6 guesses remaining`}`});
    // Send the embed
    await threadChannel.send({ embeds: [wordleEmbed] });
    // Filter messages for 5-letter words or 'stop' sent by original author
    const filter = (m: Message) => ((m.author.id === interaction.user.id) || isPublic) && (m.content.length == 5 || m.content.toLowerCase() == "stop");
    const collector = threadChannel.createMessageCollector({ 
        filter: filter, 
        time: 1800000,
        max: 100 
    });

    let guessedWords: string[] = []
    let invalidLetters = new Set<string>();
    let endMessage = "My message collector stopped- either something went wrong or you took over 30 minutes to play this game.";
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
        /*if (!validGuesses.includes(m.content.toLowerCase())) {
            await m.reply({ content: "Not a valid word- please try again!" });
            return;
        }
        */

        guesses++;
        if (!isInfinite && guesses >= 6) {
            m.reply({ content: `You ran out of guesses! The word was ${word}. Better luck next time!`});
            endMessage = `The game has ended- ${m.author.username} ran out of guesses! The word was ${word}.`;
            collector.stop();
            return;
        }
        let guess = m.content.toLowerCase();
        if (guess == word) {
            m.reply({ content: `You guessed the word! Congratulations!`});
            endMessage = `The game has ended- ${m.author.username} guessed the word! The word was ${word}.`;
            collector.stop();
            return;
        }
        guessedWords.push(guess);
        let gridString = createWordleGrid(word, guessedWords, isInfinite);
        // Fill invalid letters
        for (let j = 0; j < guess.length; j++) {
            if (guess[j] != word[j] && !word.includes(guess[j])) {
                invalidLetters.add(guess[j]);
            }
        }
        if (invalidLetters.size > 0) {
            wordleEmbed.setFields({
                name: "Invalid Letters",
                value: Array.from(invalidLetters).join(", ")
            });
        }

        wordleEmbed.setDescription(gridString);
        wordleEmbed.setFooter({text: `${isInfinite ? "Keep guessing, you have all the time in the world." : `You have ${6-guesses} guesses remaining`}`});
        await m.reply({ embeds: [wordleEmbed] });
    });

    collector.on('end', async (collected) => {
        // After the game ends, wait 10 seconds and then delete the thread
        setTimeout(async () => {
            await threadChannel.delete();
        }, 10000);
        interaction.editReply({ content: endMessage });
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
        ,
    run: async (interaction: CommandInteraction) => {
        if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.guild || !interaction.channel ) return;
        const isPublic: boolean = interaction.options.getBoolean('public') ?? false;
        const isInfinite: boolean = interaction.options.getBoolean('infinite') ?? false;

        const channel = await interaction.channel.fetch();
        // get original Message from interaction
        const replyMessage: Message = await interaction.editReply("Creating a new game of Wordle...");
        
        // get username of user who sent the command
        const username = interaction.user.username;
        // If channel is a GuildTextBasedChannel channel
        if (channel.isTextBased() && channel instanceof TextChannel) {
            const threadChannel = await replyMessage.startThread({
                name: `${username}-wordle`,
                autoArchiveDuration: 60,
                reason: `${username}'s game of wordle!`,
            });
            let startMessage = `**Let's play a game of Wordle!**\n > Wordle is a daily word game where players have ${isInfinite ? "~~six~~ *infinite*" : "six"} attempts to guess a five letter word. Feedback for each guess is given in the form of colored tiles to indicate if letters match the correct position.`;
            startMessage += `\n - You can send guesses as messages in this thread. I'll ignore any messages that aren't 5-letter words.`;
            if (isPublic) startMessage += `\n - This game is **public**: anyone can make guesses in this thread!`;
            else startMessage += `\n - Only <@${interaction.user.id}> will be able to make guesses.`;
            if (isInfinite) startMessage += `\n - This game is **infinite**: you have infinite guesses within 30 minutes until you get the word!`;
            
            startMessage += `\n - You can say "stop" at any time to end the game early, and the thread will be deleted after the game ends.`;

            
            startMessage += `\nGood luck!`;

            // Add the user
            await threadChannel.members.add(interaction.user.id);
            await threadChannel.send({ content: startMessage});

            await createWordleGame(interaction, threadChannel, isPublic, isInfinite);
            return;
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
        Feature: Feature.Wordle
    }
}