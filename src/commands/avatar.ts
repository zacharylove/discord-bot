// Get the avatar for a user
import { CommandInterface, CommandProperties } from '../interfaces/Command';
import { SlashCommandBuilder, EmbedBuilder } from "@discordjs/builders";
import { ALLOWED_EXTENSIONS, CommandInteraction, ImageExtension, User } from 'discord.js';

import axios, { AxiosResponse } from 'axios';

// Valid formats according to Discord
const validFormats : ImageExtension[] = ["webp", "png", "jpg", "jpeg"];

interface AvatarResult {
    globalAvatar: Map<ImageExtension, string> | null,
    serverAvatar: Map<ImageExtension, string> | null,
    globalBanner: Map<ImageExtension, String> | null,
    serverBanner: Map<ImageExtension, String> | null
}

/**
 * Retrieves server profile data from the API and returns it
 * Discord.js does not support server profiles >:(
 * 
 * @param interaction 
 * @param target 
 * @returns 
 */
const makeUserRequest = async (guildId: string, targetId: string): Promise<AxiosResponse<any, any>> => {
    let res = await axios.get(`https://discord.com/api/guilds/${guildId}/members/${targetId}`,
    {
        headers: {
            Authorization: `Bot ${process.env.BOT_TOKEN}`
        }
    });
    if ( res.status !== 200 ) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
    }

    return res;
}

const getServerAvatar = (guildId: string, targetId: string, results: AvatarResult, res: AxiosResponse<any, any>): Map<ImageExtension, string> => {
    let avatarURLs = new Map<ImageExtension, string>();
    if ( res.data.avatar !== undefined && res.data.avatar !== null ) {
        console.debug('Server avatar found!');
        let baseURL = `https://cdn.discordapp.com/guilds/${guildId}/users/${targetId}/avatars/${res.data.avatar}.`;

        let avatarFormats = [...validFormats];

        if (res.data.avatar.startsWith('a_')) avatarFormats.push("gif");

        for ( const format of avatarFormats ) {
            avatarURLs.set(format, baseURL + format);
        }
    }
    return avatarURLs;
}

/*
// Discord API does not support server banners :(
const getServerBanner = (guildId: string, targetId: string, results: AvatarResult, res: AxiosResponse<any, any>): Map<ImageExtension, string> => {
    let bannerURLs = new Map<ImageExtension, string>();
    console.debug(`Banner: ${res.data.}`);
    if ( res.data.banner !== undefined && res.data.banner !== null ) {
        console.debug('Server banner found!');
        let baseURL = `https://cdn.discordapp.com/guilds/${guildId}/users/${targetId}/banners/${res.data.banner}.`;
        const bannerFormat = (res.data.banner).startsWith('a_') ? "gif" : "png";
        let bannerFormats = validFormats;
        if (bannerFormat === "gif") bannerFormats.push("png");

        for ( const format of bannerFormats ) {
            bannerURLs.set(format, baseURL + format);
        }
    }
    return bannerURLs;
}
*/

const getGlobalAvatar = (target: User): Map<ImageExtension, string> => {
    let avatarURLs = new Map<ImageExtension, string>();
    let avatarFormats = [...validFormats];
    if (target.avatar && target.avatar.startsWith('a_')) avatarFormats.push("gif");

    for ( const format of avatarFormats ) {
        avatarURLs.set(format, target.displayAvatarURL({ extension: format }));
    }
    return avatarURLs;
}

const getGlobalBanner = (target: User): Map<ImageExtension, string> => {
    console.debug(`Banner: ${target.banner}`);
    let bannerURLs = new Map<ImageExtension, string>();
    if ( target.banner !== undefined && target.banner !== null ) {
        console.debug('Global banner found!');
        let bannerFormats = [...validFormats];
        if (target.banner.startsWith('a_')) bannerFormats.push("gif");

        
        for ( const format of bannerFormats ) {
            let bannerUrl = target.bannerURL({ extension: format });
            console.debug(`Banner URL: ${bannerUrl}`)
            if (typeof bannerUrl === "string") {
                bannerURLs.set(format, bannerUrl);
            }
        }
    }
    return bannerURLs;
}


export const avatar: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Get the avatar for a user')
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to get the avatar for')
                .setRequired(true)
        ),
    run: async (interaction) => {
        await interaction.deferReply();
        

        const target = interaction.options.getUser('user');
        if (!target) {
            interaction.editReply('Please provide a user to get the avatar for');
            return;
        }

        let results : AvatarResult = {
            globalAvatar: null,
            serverAvatar: null,
            globalBanner: null,
            serverBanner: null
        };

        // Server Avatar
        if ( interaction.guild != null ) {
            console.debug(`Getting server avatar/banner for ${target.tag}`);
            const res = await makeUserRequest(interaction.guild.id, target.id);
            results.serverAvatar = getServerAvatar(interaction.guild.id, target.id, results, res);
            //results.serverBanner = getServerBanner(interaction.guild.id, target.id, results, res);
            
        }
        // Global avatar
        console.debug(`Getting global avatar/banner for ${target.tag}`);
        results.globalAvatar = getGlobalAvatar(target);
        results.globalBanner = getGlobalBanner(target);

        // Create description
        let description = "";
        if ( results.globalAvatar ) {
            console.debug('Writing global avatar')
            description += "**Global Avatar:**\n";
            for ( const [format, url] of results.globalAvatar ) {
                description += `[${format}](${url}) `;
            }
        }
        if ( results.serverAvatar && results.serverAvatar.size > 0 ) {
            console.debug('Writing server avatar')
            description += "\n**Server Avatar:**\n";
            for ( const [format, url] of results.serverAvatar ) {
                description += `[${format}](${url}) `;
            }
        }
        if ( results.globalBanner && results.globalBanner.size > 0) {
            console.debug('Writing global banner')
            description += "\n**Global Banner:**\n";
            for ( const [format, url] of results.globalBanner ) {
                description += `[${format}](${url}) `;
            }
        }
        /*if ( results.serverBanner && results.serverBanner.size > 0) {
            console.debug('Writing server banner')
            description += "\n**Server Banner:**\n";
            for ( const [format, url] of results.serverBanner ) {
                description += `[${format}](${url}) `;
            }
        }*/

        description += "\n**Server Banner:**\nNot yet supported by the Discord API :(";

        const displayImage = results.serverAvatar?.get("gif") || results.serverAvatar?.get("png") || results.globalAvatar?.get("gif") || results.globalAvatar?.get("png") || target.displayAvatarURL();
        const embed = new EmbedBuilder()
            .setTitle(`${target.username}'s avatar`)
            .setDescription(description)
            .setImage(displayImage)

        await interaction.editReply({ embeds: [embed] });
        return;
    },
    properties: new Map<CommandProperties, string>([
        [CommandProperties.Name, 'Avatar'],
        [CommandProperties.Scope, 'global'],
        [CommandProperties.Enabled, 'true']
    ])
}