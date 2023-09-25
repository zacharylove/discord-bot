import { ChatInputCommandInteraction, GuildMember } from "discord.js";
import Player, { MusicStatus, SongMetadata } from "./player.js";
import { getMemberVoiceChannel, getMostPopularVoiceChannel } from "../../utils/voiceChannelUtils.js";
import { parseQuery } from "../../api/youtubeAPI.js";

// Queuer parses input queries and calls the corresponding player object
export class Queuer {

    constructor(private readonly guildQueueManager: guildQueueManager) {}

    public async addToQueue({
        query,
        interaction
    }: {
        query: string,
        interaction: ChatInputCommandInteraction
    }): Promise<void> {
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
            }, true);
        });
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
            // TODO: build embed
            await interaction.editReply({
                content: 'test',
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
    
        if (songs.length === 1) {
            await interaction.editReply(`Okay, **${firstSong.title}** is now playing${extraMsg}`);
        } else {
            await interaction.editReply(`u betcha, **${firstSong.title}** and ${songs.length - 1} other songs were added to the queue${extraMsg}`);
        }
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