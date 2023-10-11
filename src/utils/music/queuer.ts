import { ChatInputCommandInteraction, GuildMember } from "discord.js";
import Player, { MusicStatus, QueuedSong, SongMetadata } from "./player.js";
import { getMemberVoiceChannel, getMostPopularVoiceChannel } from "../../utils/voiceChannelUtils.js";
import { parseQuery } from "../../api/youtubeAPI.js";
import { EmbedBuilder } from "@discordjs/builders";

// Queuer parses input queries and calls the corresponding player object
export class Queuer {

    constructor(private readonly guildQueueManager: guildQueueManager) {}

    public async addToQueue({
        query,
        interaction
    }: {
        query: string,
        interaction: ChatInputCommandInteraction
    }, shuffle: boolean, next: boolean): Promise<void> {
        const guildId: string = interaction.guild!.id;
        const player = this.guildQueueManager.get(guildId);
        const songAlreadyPlaying: boolean = player.getCurrent() !== null;
        const [targetVoiceChannel] = getMemberVoiceChannel(interaction.member as GuildMember) ?? getMostPopularVoiceChannel(interaction.guild!);

        //const settings = await getGuildSettings(guildId);
        //const {playlistLimit} = settings;
        

        let songs: SongMetadata[] = await parseQuery(query);
        songs.forEach(song => {
            player.add({
                ...song,
                addedInChannelId: interaction.channel!.id,
                requestedBy: interaction.member!.user.id,
            }, next);
        });
        if (shuffle) player.shuffle();
        const firstSong = songs[0];
        
        let statusMessage: string = '';
        let extraMsg: string = '';

        // Connect to voice channel
        if (player.voiceConnection === null) {
            await player.connect(targetVoiceChannel);
            // Play!
            await player.play();
            if (songAlreadyPlaying) {
                statusMessage = 'resuming playback';
            }
            await interaction.editReply({
                content: 'Getting your song....',
            });
        } else if (player.status === MusicStatus.IDLE) {
            // Player is idle, start playback instead
            await player.play();
        }

        // Build response message
        if (statusMessage !== '') {
            if (extraMsg === '') {
              extraMsg = statusMessage;
            } else {
              extraMsg = `${statusMessage}, ${statusMessage}`;
            }
        }
    
        if (extraMsg !== '') {
            extraMsg = ` (${extraMsg})`;
        }
        const queueLength = player.getQueue().length;
        if (songs.length === 1) {
            if (queueLength > 1) {
                await interaction.editReply(`Okay, **${firstSong.title}** was added to the queue and will play after ${queueLength - 1} song${queueLength > 1 ? 's': ''}${extraMsg}`);
            } else {
                await interaction.editReply(`Okay, **${firstSong.title}** is now playing${extraMsg}`);
            } 
        } else {
            if (queueLength > 1) {
                await interaction.editReply(`Okay, **${firstSong.title}** and ${songs.length - 1} other songs were added to the queue and will play after ${queueLength - 1} song${queueLength > 1 ? 's': ''}${extraMsg}`);
            } else {
                await interaction.editReply(`Okay, **${firstSong.title}** and ${songs.length - 1} other songs were added to the queue${extraMsg}`);
            }
        }

        
    }

    async secondsToTimestamp(seconds: number): Promise<string> {
        function leadingZeroes(num: number, size: number) {
            let strNum = num.toString();
            while (strNum.length < size) strNum = "0" + strNum;
            return strNum;
        }

        let m = 0;
        let h = 0;
        let s = seconds;
        while (s > 60) {
            m++;
            s -= 60;
        }
        while (m > 60) {
            h++;
            m -= 60;
        }
        return `${h > 0 ? `${leadingZeroes(h,2)}:` : ''}${m > 0 ? `${leadingZeroes(m,2)}` : '00'}:${leadingZeroes(s,2)}`;
    }

    public createQueueEmbed = async (guildId: string, page: number): Promise<EmbedBuilder> => {
       
        const player = this.guildQueueManager.get(guildId);
        const queue = player.getQueue();
        const progressInCurrentSong = await this.secondsToTimestamp(await player.getPosition());

        const embed = new EmbedBuilder()
            .setTimestamp()
        ;

        let title = '';
        switch (player.status) {
            case MusicStatus.PLAYING:
                title += '▶️';
                break;
            case MusicStatus.PAUSED:
                title += '⏸️';
                break;
            case MusicStatus.IDLE:
                title += '⏹️';
                break;
        }
        title += ` Queue${player.currentVoiceChannel ? ` for ${player.currentVoiceChannel.name}` : ''}`;


        // Split songs into multiple pages if there are more than 10
        let splitQueue: QueuedSong[][] = [];
        for (let i = 0; i < queue.length; i += 10) {
            splitQueue.push(queue.slice(i, i + 10));
        }
        

        let currentPage = page - 1;

        let description = splitQueue.length > 1 ? `Page ${currentPage + 1}/${splitQueue.length}\n` : '';
        let counter = 1;
        let totalDuration = 0;
        
        for ( const song of splitQueue.at(currentPage) ?? []) {
            description += `${counter}.`;
            description += ` **[${song.title}](https://www.youtube.com/watch?v=${song.url})**`;
            description += `${song.requestedBy ? ` (<@${song.requestedBy}>` : ''})`;
            if (counter === 1) {
                description += ` - \`[${progressInCurrentSong}/${await this.secondsToTimestamp(song.length)}]\``;
            } else {
                description += ' - `[' + await this.secondsToTimestamp(song.length) + ']`';
            }
            description += '\n';
            counter++;
            totalDuration += song.length;
        }
        description += `There are ${queue.length} tracks with a remaining length of \`${await this.secondsToTimestamp(totalDuration - player.getPosition())}\`.\n`;

        embed.setTitle(title);
        embed.setThumbnail(player.getCurrent()?.thumbnailUrl ?? null);
        embed.setDescription(description);
        embed.setFooter({text: 'Use /queue <page> to view specific pages'});


        return embed;
    }

    public createNowPlayingEmbed = async (guildId: string): Promise<EmbedBuilder> => {
        const player = this.guildQueueManager.get(guildId);
        const queue = player.getQueue();
        const progressInCurrentSong = await this.secondsToTimestamp(await player.getPosition());

        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(player.getStatus() === MusicStatus.PLAYING ? 2067276 : 10038562)
            .setTitle(player.getStatus() === MusicStatus.PLAYING ? 'Now Playing' : 'Paused')
        ;

        
        const song = player.getCurrent();
        let playerStr = '';
        if (song) {
            const position = await player.getPosition()
            const barWidth = 15;
            const button = player.status === MusicStatus.PLAYING ? '⏹️' : '▶️';
            const dotPosition = Math.floor(barWidth * position / song.length);
            let progressBar = '';
            for (let i = 0; i < barWidth; i++) {
                if (i === dotPosition) {
                    progressBar += '🔘';
                } else {
                  progressBar += '▬';
                }
            }


            //const progressBar = getProgressBar(15, position / song.length);
            const elapsedTime = song.isLive ? 'live' : `${await this.secondsToTimestamp(position)}/${await this.secondsToTimestamp(song.length)}`;
            const loop = player.loopCurrentSong ? '🔁' : '';
            playerStr = `${button} ${progressBar} \`[${elapsedTime}]\` 🔉 ${loop}`;
            embed.setDescription(`**[${song?.title}](https://www.youtube.com/watch?v=${song?.url})**\nRequested By <@${song?.requestedBy}>\n${playerStr}`);
            embed.setThumbnail(song?.thumbnailUrl ?? null);
            embed.setFooter({text: `Source: ${song?.artist ?? 'Unknown'}`});
        } else {
            embed.setDescription('Nothing is currently playing');
        }

        
        return embed;
    }
}

// Manager for all guild queues
export class guildQueueManager {
    // Guild ID -> Player
    private readonly guildPlayers: Map<string, Player>;
    // private readonly fileCache: FileCacheProvider;

    constructor() {
        this.guildPlayers = new Map<string, Player>();
    }

    get(guildId: string): Player {
        let player = this.guildPlayers.get(guildId);
        if (!player) {
            player = new Player(guildId);
            this.guildPlayers.set(guildId, player);
        }
        return player;
    }
}