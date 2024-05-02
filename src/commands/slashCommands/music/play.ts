import { CommandInterface, Feature } from "../../../interfaces/Command.js";
import { APIApplicationCommandOptionChoice, AutocompleteInteraction, ChatInputCommandInteraction, CommandInteraction, SlashCommandBuilder } from "discord.js";
import { BOT } from "../../../index.js";
import { GatewayIntentBits } from "discord-api-types/v10";
import { getYoutubeSuggestionsForQuery } from "../../../api/youtubeAPI.js";
import { getSpotifySuggestionsForQuery } from "../../../api/spotifyAPI.js";
// @ts-ignore
import { default as config } from "../../../config/config.json" assert { type: "json" };
import { getSoundCloudSuggestionsForQuery } from "../../../api/soundCloudAPI.js";

const autocompleteLimit = config.music.autocompleteLimit;

// Autocomplete the 'query' argument with results from Youtube and Spotify
const autocompleteQuery = async (interaction: AutocompleteInteraction, limit = 9) => {
    try {
        const query = interaction.options.getString('query')?.trim();
        if (!query || query.length <= 3) {
            await interaction.respond([]);
            return;
        }

        // Ignore direct URLs
        try {
            new URL(query);
            await interaction.respond([]);
            return;
        } catch {}

        const youtubeSuggestions = await getYoutubeSuggestionsForQuery(query);
        const spotifyResponse: [SpotifyApi.TrackObjectFull[], SpotifyApi.AlbumObjectSimplified[]] = await getSpotifySuggestionsForQuery(query);
        
        const soundCloudSuggestions = await getSoundCloudSuggestionsForQuery(query);
        const spotifyTrackSuggestions = spotifyResponse[0];
        const spotifyAlbumSuggestions = spotifyResponse[1];

        const maxSpotifySuggestions = Math.min(limit / 3, spotifyTrackSuggestions.length + spotifyAlbumSuggestions.length);
        const maxSpotifyAlbumSuggestions = Math.min(Math.floor(maxSpotifySuggestions / 2), spotifyAlbumSuggestions.length ?? 0);
        const maxSpotifyTrackSuggestions = maxSpotifySuggestions - maxSpotifyAlbumSuggestions;
        
        const maxYoutubeSuggestions = Math.min((limit - maxSpotifySuggestions) / 2, youtubeSuggestions.length);

        const maxSoundCloudSuggestions = Math.min(limit - maxYoutubeSuggestions - maxSpotifySuggestions, soundCloudSuggestions.length)
        
        const suggestions: APIApplicationCommandOptionChoice[] = [];
        suggestions.push(
            ...youtubeSuggestions
            .slice(0, maxYoutubeSuggestions)
            .map(suggestion => ({
                name: `🎥 ${suggestion.substring(0,85)}`,
                value: suggestion,
            }),
        ));

        suggestions.push(
            ...spotifyAlbumSuggestions.slice(0, maxSpotifyAlbumSuggestions).map(album => ({
            name: `💿 ${album.name.substring(0,50)}${album.artists.length > 0 ? ` - ${album.artists[0].name.substring(0,30)}` : ''}`,
            value: `spotify:album:${album.id}`,
            })),
        );
        
        suggestions.push(
            ...spotifyTrackSuggestions.slice(0, maxSpotifyTrackSuggestions).map(track => ({
            name: `🎵 ${track.name.substring(0,50)}${track.artists.length > 0 ? ` - ${track.artists[0].name.substring(0,30)}` : ''}`,
            value: `spotify:track:${track.id}`,
            })),
        );

        suggestions.push(
            ...soundCloudSuggestions.slice(0, maxSoundCloudSuggestions).map(track => ({
                name: `☁️ ${track.name.substring(0,50)}${track.publisher != null ? ` - ${track.publisher.artist}` : track.user.name != undefined ?` - ${track.user.name}` : ''}`,
                value: track.permalink
            }))
        )

        await interaction.respond(suggestions);
    } catch (e) {
        console.error(`Error in /play autocomplete: ${e}`);
    }
}

export const playSong: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('(Music) Plays a song in your current voice channel')
        .addStringOption((option) =>
            option
                .setName('query')
                .setDescription('The song to play')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addBooleanOption((option) =>
            option
                .setName('next')
                .setDescription('Whether to add to the front of the queue')
        )
        .addBooleanOption((option) =>
            option
                .setName('shuffle')
                .setDescription('Whether to shuffle the queue')
        )
        ,
    run: async (interaction: CommandInteraction) => {
        if( !interaction.isChatInputCommand() || !interaction.guild) return;
        const guildMember = interaction.guild.members.cache.get(interaction.user.id);
        if (!guildMember?.voice.channel) {
            interaction.editReply("You are not currently in a voice channel!");
            return;
        }
        const query = interaction.options.getString('query')!;
        const next = interaction.options.getBoolean('next') ?? false;
        const shuffle = interaction.options.getBoolean('shuffle') ?? false;
        const guildQueuer = BOT.getMusicQueuer();

        await guildQueuer.addToQueue({
            query: query,
            interaction: interaction
        }, shuffle, next);
    },
    autocomplete: async (interaction: AutocompleteInteraction, limit = autocompleteLimit) => {
        await autocompleteQuery(interaction, limit);
    },
    properties: {
        Name: "play",
        Aliases: ["p"],
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

// P alias
// Apparently cloning the command and changing the name causes some unintended issues so we're going the annoying copy/paste route
export const pSong: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('p')
        .setDescription('(Music) Plays a song in your current voice channel')
        .addStringOption((option) =>
            option
                .setName('query')
                .setDescription('The song to play')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addBooleanOption((option) =>
            option
                .setName('next')
                .setDescription('Whether to add to the front of the queue')
        )
        .addBooleanOption((option) =>
            option
                .setName('shuffle')
                .setDescription('Whether to shuffle the queue')
        )
        ,
    run: async (interaction: CommandInteraction) => {
        if( !interaction.isChatInputCommand() || !interaction.guild) return;
        const guildMember = interaction.guild.members.cache.get(interaction.user.id);
        if (!guildMember?.voice.channel) {
            interaction.editReply("You are not currently in a voice channel!");
            return;
        }
        const query = interaction.options.getString('query')!;
        const next = interaction.options.getBoolean('next') ?? false;
        const shuffle = interaction.options.getBoolean('shuffle') ?? false;
        const guildQueuer = BOT.getMusicQueuer();

        await guildQueuer.addToQueue({
            query: query,
            interaction: interaction
        }, shuffle, next);
    },
    autocomplete: async (interaction: AutocompleteInteraction, limit = autocompleteLimit) => {
        await autocompleteQuery(interaction, limit);
    },
    properties: {
        Name: "p",
        Aliases: [],
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

// Playnext command
export const playNext: CommandInterface = {
    data: new SlashCommandBuilder()
    .setName('playnext')
    .setDescription('(Music) Add a song to the front of the music queue')
    .addStringOption((option) =>
        option
            .setName('query')
            .setDescription('The song to play')
            .setRequired(true)
            .setAutocomplete(true)
    )
    .addBooleanOption((option) =>
        option
            .setName('shuffle')
            .setDescription('Whether to shuffle the queue')
    )
    ,
    run: async (interaction: CommandInteraction) => {
        if( !interaction.isChatInputCommand() || !interaction.guild) return;
        const guildMember = interaction.guild.members.cache.get(interaction.user.id);
        if (!guildMember?.voice.channel) {
            interaction.editReply("You are not currently in a voice channel!");
            return;
        }
        const query = interaction.options.getString('query')!;
        const next = interaction.options.getBoolean('next') ?? false;
        const guildQueuer = BOT.getMusicQueuer();

        await guildQueuer.addToQueue({
            query: query,
            interaction: interaction
        }, true, next);
    },
    autocomplete: async (interaction: AutocompleteInteraction, limit = autocompleteLimit) => {
        await autocompleteQuery(interaction, limit);
    },
    properties: {
        Name: "playnext",
        Aliases: [],
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

// Pnext alias
// Playnext command
export const pNext: CommandInterface = {
    data: new SlashCommandBuilder()
    .setName('pn')
    .setDescription('(Music) Add a song to the front of the music queue')
    .addStringOption((option) =>
        option
            .setName('query')
            .setDescription('The song to play')
            .setRequired(true)
            .setAutocomplete(true)
    )
    .addBooleanOption((option) =>
        option
            .setName('shuffle')
            .setDescription('Whether to shuffle the queue')
    )
    ,
    run: async (interaction: CommandInteraction) => {
        if( !interaction.isChatInputCommand() || !interaction.guild) return;
        const guildMember = interaction.guild.members.cache.get(interaction.user.id);
        if (!guildMember?.voice.channel) {
            interaction.editReply("You are not currently in a voice channel!");
            return;
        }
        const query = interaction.options.getString('query')!;
        const next = interaction.options.getBoolean('next') ?? false;
        const guildQueuer = BOT.getMusicQueuer();

        await guildQueuer.addToQueue({
            query: query,
            interaction: interaction
        }, true, next);
    },
    autocomplete: async (interaction: AutocompleteInteraction, limit = autocompleteLimit) => {
        await autocompleteQuery(interaction, limit);
    },
    properties: {
        Name: "pn",
        Aliases: [],
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