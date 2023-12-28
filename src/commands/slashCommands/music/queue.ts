import { GatewayIntentBits } from "discord-api-types/v9";
import { ActionRowBuilder, ButtonStyle, CommandInteraction, ComponentType, Message, MessageActionRowComponentBuilder, SlashCommandBuilder } from "discord.js";
import { BOT } from "../../../index.js";
import { CommandInterface, Feature } from "../../../interfaces/Command.js";
import { ButtonBuilder } from "@discordjs/builders";
import Player, { MusicStatus } from "../../../utils/music/player.js";
// @ts-ignore
import { default as config } from "../../../config/config.json" assert { type: "json" };
import { Queuer } from "../../../utils/music/queuer.js";


const createEmbed = async (interaction: Message<boolean>, page: number, player: Player, musicQueuer: Queuer): Promise<Message<boolean>> => {
    const embed = await musicQueuer.createQueueEmbed(interaction.guild!.id, page);

    // Create controls
    const row: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();
    if (player.getStatus() != MusicStatus.IDLE) {
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

    }

    return await interaction.edit({embeds: [embed], components: [row]});
}

const sendEmbedAndCollectResponses = async (interaction: Message<boolean>, page: number, player: Player, musicQueuer: Queuer): Promise<null> => {
    interaction.edit(`Here's the music queue! <a:doggoDance:${config.music.emojiIds.doggoDance}>`);
    const response: Message<boolean> = await createEmbed(interaction, page, player, musicQueuer);

    // 2 minute response collection period
    response.awaitMessageComponent({ componentType: ComponentType.Button }).then( async buttonResponse => {
        let responseStatus: boolean;
        switch (buttonResponse.customId) {
            case "playpause":
                let action = "";
                if (player.getStatus() == MusicStatus.PAUSED) {
                    player.resume();
                    action = "resumed";
                } else {
                    player.pause();
                    action = "paused";
                }
                // Recreate embed
                await sendEmbedAndCollectResponses(interaction, page, player, musicQueuer);
                await buttonResponse.reply(`<@${buttonResponse.user.id}> ${action} playback!`);
                break;
            case "backward":
                responseStatus = await player.backward(1);
                if (responseStatus == false) {
                    await buttonResponse.reply(`<@${buttonResponse.user.id}> skipped backwards and reached the beginning of the queue!`);
                } else {
                    await buttonResponse.reply(`<@${buttonResponse.user.id}> skipped backwards!`);
                }
                await sendEmbedAndCollectResponses(interaction, page, player, musicQueuer);
                break;
            case "forward":
                responseStatus = await player.forward(1);
                if (responseStatus == false) {
                    await buttonResponse.reply(`<@${buttonResponse.user.id}> skipped forwards and reached the end of the queue!`);
                } else {
                    await buttonResponse.reply(`<@${buttonResponse.user.id}> skipped forwards!`);
                }
                await sendEmbedAndCollectResponses(interaction, page, player, musicQueuer);
                break;
            case "stop":
                let numCleared = player.stop();
                await buttonResponse.reply(`<@${buttonResponse.user.id}> stopped playback and cleared ${numCleared} songs from the queue! Disconnecting now...`);
                await sendEmbedAndCollectResponses(interaction, page, player, musicQueuer);
                break;
            case "loop":
                player.loopCurrentSong = !player.loopCurrentSong;
                await buttonResponse.reply(`<@${buttonResponse.user.id}> set the current song to ${player.loopCurrentSong ? "loop" : "stop looping"}!`);
                await sendEmbedAndCollectResponses(interaction, page, player, musicQueuer);
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