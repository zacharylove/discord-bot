// Get the avatar for a user
import { CommandInterface, CommandProperties } from '../interfaces/Command';
import { SlashCommandBuilder, EmbedBuilder } from "@discordjs/builders";
import { ALLOWED_EXTENSIONS, CommandInteraction, ImageExtension, User } from 'discord.js';
import { getGlobalAvatar, getGlobalBanner, getServerProfileAvatar } from '../utils/userUtils';





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
        

        const target = await interaction.options.getUser('user')?.fetch(true);
        if (!target) {
            interaction.editReply('Please provide a user to get the avatar for');
            return;
        }

        let results = {
            globalAvatar: new Map<ImageExtension, string>(),
            serverAvatar: new Map<ImageExtension, string>(),
            globalBanner: new Map<ImageExtension, string>(),
            serverBanner: new Map<ImageExtension, string>()
        };

        // Server Avatar
        if ( interaction.guild != null ) {
            results.serverAvatar = await getServerProfileAvatar(target, interaction.guild.id);            
        }
        // Global avatar
        results.globalAvatar = getGlobalAvatar(target);
        results.globalBanner = getGlobalBanner(target);

        // Create description
        let description = "";
        if ( results.globalAvatar ) {
            // console.debug('Writing global avatar')
            description += "**Global Avatar:**\n";
            for ( const [format, url] of results.globalAvatar ) {
                description += `[${format}](${url}) `;
            }
        }
        if ( results.serverAvatar && results.serverAvatar.size > 0 ) {
            // console.debug('Writing server avatar')
            description += "\n**Server Avatar:**\n";
            for ( const [format, url] of results.serverAvatar ) {
                description += `[${format}](${url}) `;
            }
        }
        if ( results.globalBanner && results.globalBanner.size > 0) {
            // console.debug('Writing global banner')
            description += "\n**Global Banner:**\n";
            for ( const [format, url] of results.globalBanner ) {
                description += `[${format}](${url}) `;
            }
        }
        /*if ( results.serverBanner && results.serverBanner.size > 0) {
            // console.debug('Writing server banner')
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
    properties: {
        Name: 'Avatar',
        Aliases: ['Profile Picture', "Banner"],
        Scope: 'global',
        GuildOnly: true,
        Enabled: true,
        DefaultEnabled: true,
        Intents: []
    }
}