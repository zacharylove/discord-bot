import { GatewayIntentBits } from "discord-api-types/v9";
import { ActionRowBuilder, ButtonStyle, CommandInteraction, ComponentType, Message, MessageActionRowComponentBuilder, SlashCommandBuilder } from "discord.js";
import { BOT } from "../../../index.js";
import { CommandInterface, Feature } from "../../../interfaces/Command.js";
import { ButtonBuilder } from "@discordjs/builders";
import Player, { MusicStatus, storedQueueMessage } from "../../../utils/music/player.js";
// @ts-ignore
import { default as config } from "../../../config/config.json" assert { type: "json" };
import { Queuer } from "../../../utils/music/queuer.js";
import { sleep } from "../../../utils/utils.js";


const embedRefreshDelay = 1000;

export const refreshEmbed = async (storedMessage: storedQueueMessage) => {
    const queuer = BOT.getMusicQueuer();
    const player = BOT.getMusicQueuerManager().get(storedMessage.guildId);
    await sendEmbedAndCollectResponses(storedMessage.message, storedMessage.page, player, queuer, false);
}

export const createEmbed = async (interaction: Message<boolean>, page: number, player: Player, musicQueuer: Queuer, noButtons: boolean): Promise<Message<boolean>> => {
    const embed = await musicQueuer.createQueueEmbed(interaction.guild!.id, page);

    // Create controls
    if (player.getStatus() != MusicStatus.IDLE && !noButtons) {
        const row: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();
        // Skip Backwards
        const backwardsButton = new ButtonBuilder()
            .setCustomId("backward")
            .setStyle(ButtonStyle.Secondary);
        if (config.music.emojiIds.backward) {
            backwardsButton.setEmoji({
                name: "backward",
                id: config.music.emojiIds.backward
            })
        } else { backwardsButton.setLabel("Back"); }
        row.addComponents(backwardsButton);

        // Play/Pause Music
        const playPauseButton = new ButtonBuilder()
            .setCustomId("playpause")
            .setStyle(ButtonStyle.Secondary);

        if (player.getStatus() == MusicStatus.PLAYING) {
            if (config.music.emojiIds.pause) {
                playPauseButton.setEmoji({
                        name: "pause",
                        id: config.music.emojiIds.pause
                    });
            } else {
                playPauseButton.setLabel("Pause");
            }
        } else if (player.getStatus() == MusicStatus.PAUSED) {
            if (config.music.emojiIds.play) {
                playPauseButton.setEmoji({
                    name: "play",
                    id: config.music.emojiIds.play
                });
            } else {
                playPauseButton.setLabel("Play");
            }
        }
        row.addComponents(playPauseButton);

        // Stop Music
        const stopButton = new ButtonBuilder()
            .setCustomId("stop")
            .setStyle(ButtonStyle.Danger);
        if (config.music.emojiIds.stop) {
            stopButton.setEmoji({
                name: "stop",
                id: config.music.emojiIds.stop
            })
        } else { stopButton.setLabel("Stop"); }
        row.addComponents(stopButton);

        // Skip Forwards
        const forwardsButton = new ButtonBuilder()
            .setCustomId("forward")
            .setStyle(ButtonStyle.Secondary);
        if (config.music.emojiIds.forward) {
            forwardsButton.setEmoji({
                name: "forward",
                id: config.music.emojiIds.forward
            })
        } else { forwardsButton.setLabel("Next"); }
        row.addComponents(forwardsButton);

        // Loop Song
        const loopButton = new ButtonBuilder()
            .setCustomId("loop");
        if (player.loopCurrentSong) loopButton.setStyle(ButtonStyle.Primary);
        else loopButton.setStyle(ButtonStyle.Secondary);
            
        if (config.music.emojiIds.loop) {
            loopButton.setEmoji({
                name: "loop",
                id: config.music.emojiIds.loop
            })
        } else {
            loopButton.setLabel("Loop");
        }
        row.addComponents(loopButton);

        // Add song
        /*const addButton = new ButtonBuilder()
            .setCustomId("add")
            .setStyle(ButtonStyle.Success);
        if (config.music.emojiIds.add) {
            addButton.setEmoji({
                name: "add",
                id: config.music.emojiIds.add
            })
        } else addButton.setLabel("Add Song");*/

        return await interaction.edit({embeds: [embed], components: [row]});
    } else {
        return await interaction.edit({embeds: [embed], components: []});
    }

    
}

const sendEmbedAndCollectResponses = async (interaction: Message<boolean>, page: number, player: Player, musicQueuer: Queuer, noButtons: boolean = false): Promise<null> => {
    await interaction.edit(`Here's the music queue! <a:doggoDance:${config.music.emojiIds.doggoDance}>`);
    const response: Message<boolean> = await createEmbed(interaction, page, player, musicQueuer, noButtons);

    // If there is a previous queue message, delete it
    if (player.activeQueueMessage && player.activeQueueMessage.message.id != response.id) {
        await player.activeQueueMessage.message.delete();
    }
    player.activeQueueMessage = {
        message: response,
        page: page,
        guildId: player.guildId
    };

    // 2 minute response collection period
    response.awaitMessageComponent({ componentType: ComponentType.Button }).then( async buttonResponse => {
        let responseStatus: boolean;
        let newSong, reply;
        switch (buttonResponse.customId) {
            case "playpause":
                let action = "";
                let emoji = "";
                if (player.getStatus() == MusicStatus.PAUSED) {
                    player.resume();
                    action = "resumed";
                    emoji = `<:play:${config.music.emojiIds.play}>`
                } else {
                    player.pause();
                    action = "paused";
                    emoji = `<:pause:${config.music.emojiIds.pause}>`
                }
                reply = await buttonResponse.reply(`${emoji} <@${buttonResponse.user.id}> ${action} playback!`);
                // Recreate embed
                sleep(embedRefreshDelay).then( async () => { await sendEmbedAndCollectResponses(interaction, page, player, musicQueuer); });
                break;
            case "backward":
                responseStatus = await player.backward(1);
                newSong = player.getQueue()[player.getQueuePosition()];
                if (responseStatus == false) {
                    await buttonResponse.reply(`<:backward:${config.music.emojiIds.backward}> <@${buttonResponse.user.id}> skipped backwards and reached the beginning of the queue!`);
                } else {
                    await buttonResponse.reply(`<:backward:${config.music.emojiIds.backward}> <@${buttonResponse.user.id}> skipped backwards! Now playing [${newSong.title}](<https://www.youtube.com/watch?v=${newSong.url}>) <a:doggoDance:${config.music.emojiIds.doggoDance}>`);
                }
                sleep(embedRefreshDelay).then( async () => { await sendEmbedAndCollectResponses(interaction, page, player, musicQueuer); });
                break;
            case "forward":
                responseStatus = await player.forward(1);
                newSong = player.getQueue()[player.getQueuePosition()];
                if (responseStatus == false) {
                    await buttonResponse.reply(`<:forward:${config.music.emojiIds.forward}> <@${buttonResponse.user.id}> skipped forwards and reached the end of the queue!`);
                } else {
                    await buttonResponse.reply(`<:forward:${config.music.emojiIds.forward}> <@${buttonResponse.user.id}> skipped forwards! Now playing [${newSong.title}](<https://www.youtube.com/watch?v=${newSong.url}>) <a:doggoDance:${config.music.emojiIds.doggoDance}>`);
                }
                sleep(embedRefreshDelay).then( async () => { await sendEmbedAndCollectResponses(interaction, page, player, musicQueuer); });
                break;
            case "stop":
                let numCleared = player.stop();
                await buttonResponse.reply(`<:stop:${config.music.emojiIds.stop}> <@${buttonResponse.user.id}> stopped playback and cleared ${numCleared} songs from the queue! Disconnecting now...`);
                sleep(embedRefreshDelay).then( async () => { await sendEmbedAndCollectResponses(interaction, page, player, musicQueuer); });
                break;
            case "loop":
                player.loopCurrentSong = !player.loopCurrentSong;
                await buttonResponse.reply(`<:loop:${config.music.emojiIds.loop}> <@${buttonResponse.user.id}> set the current song to ${player.loopCurrentSong ? "loop" : "stop looping"}!`);
                sleep(embedRefreshDelay).then( async () => { await sendEmbedAndCollectResponses(interaction, page, player, musicQueuer); });
                break;

        }
        return null;
    }).catch(e => {
        console.debug(`Error: ${e}`)
    });
    return null;
}

export const queue: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('(Music) Displays the current queue')
        .addIntegerOption((option) =>
            option
                .setName('page')
                .setDescription('The page of the queue to display')
                .setRequired(false)
        ),
    run: async (interaction: CommandInteraction) => {
        if( !interaction.isChatInputCommand() ) return;
        const page: number = interaction.options.getInteger('page') ?? 1;
        const message: Message<boolean> = await interaction.editReply("Loading the music queue...");
        const musicQueuer = BOT.getMusicQueuer();
        const player = BOT.getMusicQueuerManager().get(interaction.guildId!);

        await sendEmbedAndCollectResponses(message, page, player, musicQueuer);

        
    },
    properties: {
        Name: "queue",
        Aliases: ["q"],
        Scope: "global",
        GuildOnly: true,
        Enabled: true,
        DefaultEnabled: true,
        CanBeDisabled: true,
        Intents: [GatewayIntentBits.GuildVoiceStates],
        Permissions: [],
        Ephemeral: false,
        Feature: Feature.Music
    }
}