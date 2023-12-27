import { CommandInterface, Feature } from "../../../interfaces/Command.js";
import { APIApplicationCommandOptionChoice, AutocompleteInteraction, ChatInputCommandInteraction, CommandInteraction, SlashCommandBuilder } from "discord.js";
import { BOT } from "../../../index.js";
import { GatewayIntentBits } from "discord-api-types/v9";
import { getYoutubeSuggestionsForQuery } from "../../../api/youtubeAPI.js";
import { getSpotifySuggestionsForQuery } from "../../../api/spotifyAPI.js";
// @ts-ignore
import { default as config } from "../../../config/config.json" assert { type: "json" };

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
        if( !interaction.isChatInputCommand() ) return;
        const query = interaction.options.getString('query')!;
        const next = interaction.options.getBoolean('next') ?? false;
        const shuffle = interaction.options.getBoolean('shuffle') ?? false;
        const guildQueuer = BOT.getMusicQueuer();

        await guildQueuer.addToQueue({
            query: query,
            interaction: interaction
        }, shuffle, next);
    },
    autocomplete: async (interaction: AutocompleteInteraction, limit = 10) => {
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
        const spotifyTrackSuggestions = spotifyResponse[0];
        const spotifyAlbumSuggestions = spotifyResponse[1];

        const maxSpotifySuggestions = Math.min(limit /2, spotifyTrackSuggestions.length + spotifyAlbumSuggestions.length);
        const maxSpotifyAlbumSuggestions = Math.min(Math.floor(maxSpotifySuggestions / 2), spotifyAlbumSuggestions.length ?? 0);
        const maxSpotifyTrackSuggestions = maxSpotifySuggestions - maxSpotifyAlbumSuggestions;
        const maxYoutubeSuggestions = Math.min(limit - maxSpotifySuggestions, youtubeSuggestions.length);
        
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

        await interaction.respond(suggestions);
    },
    properties: {
        Name: "play",
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