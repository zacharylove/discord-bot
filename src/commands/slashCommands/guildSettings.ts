// View a list of guild-specific settings and enable/disable commands and features.
import { CommandInterface } from "../../interfaces/Command.js";
import { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ActionRowBuilder, MessageActionRowComponentBuilder } from "@discordjs/builders";
import { addDisabledCommand, addEnabledCommand, areWordleFeaturesEnabled, disableStarboardFeature, disableWordleFeatures, enableStarboardFeature, enableWordleFeatures, getDisabledCommandListAsString, getEnabledCommandListAsString, getGuildDataByGuildID, isCustomResponseEnabled, isInstagramEmbedFixEnabled, isStarboardEnabled, isTikTokEmbedFixEnabled, isTwitterEmbedFixEnabled, toggleCustomResponse, toggleInstagramEmbedFix, toggleTikTokEmbedFix, toggleTwitterEmbedFix } from "../../database/guildData.js";
import { GuildDataInterface } from "../../database/models/guildModel.js";
import { commandNotImplemented, getCommandListAsString } from "../../utils/commandUtils.js";
import { ButtonStyle, CommandInteraction, ComponentType, Message, PermissionsBitField, User } from "discord.js";
import { hasPermissions } from "../../utils/userUtils.js";
import CommandList from "../_CommandList.js";
import { getCommandByName, sleep } from "../../utils/utils.js";

// TODO: clean up enabled/disabled features.... lots of repeated code rn


// Required permission to enable/disable
const requiredPermissions = PermissionsBitField.Flags.ManageGuild;

// Prevents multiple edits occurring at once.
let ongoingEdit: boolean = false;

let enabledCommandList: string[];
let disabledCommandList: string[];

const sendEmbedAndCollectResponses = async (
    interaction: Message<boolean>, 
    embed: EmbedBuilder, 
    guildData: GuildDataInterface, 
    author: User, 
    type: string
) => {
    // Create navigation buttons
    const row: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();
    
    
    if (type != 'home') {
        const homeButton = new ButtonBuilder()
            .setLabel("Home")
            .setStyle(ButtonStyle.Primary)
            .setCustomId('home');
        row.addComponents(homeButton);
    }
    if (type != 'feature') {
        const featureButton = new ButtonBuilder()
            .setLabel("Features")
            .setStyle(ButtonStyle.Primary)
            .setCustomId('features');
        row.addComponents(featureButton);
    }

    if (type != 'command') {
        const commandButton = new ButtonBuilder()
            .setLabel("Commands")
            .setStyle(ButtonStyle.Primary)
            .setCustomId('commands');
        row.addComponents(commandButton);
    }
    // Only show enable/disable buttons if user has the MANAGE_GUILD permission
    if (type != 'home' && hasPermissions(requiredPermissions, interaction.guild!, author)) {
        const enableButton = new ButtonBuilder()
            .setLabel("Enable " + type)
            .setStyle(ButtonStyle.Success)
            .setCustomId('enable');
        row.addComponents(enableButton);

        const disableButton = new ButtonBuilder()
            .setLabel("Disable " + type)
            .setStyle(ButtonStyle.Danger)
            .setCustomId('disable');
        row.addComponents(disableButton);
    }

    const doneButton = new ButtonBuilder()
        .setLabel("Done")
        .setStyle(ButtonStyle.Secondary)
        .setCustomId('done');
    row.addComponents(doneButton);


    let response: Message<boolean> = await interaction.edit({content: "", embeds: [embed], components: [row]});
    const collectorFilter = (i: { user: { id: string; }; }) => i.user.id === author.id;
    const buttonCollector = response.createMessageComponentCollector({ componentType: ComponentType.Button, filter: collectorFilter, time: 60000});
    
    buttonCollector.on('collect', async buttonResponse => {
        // I love 'Unknown interaction' errors!!!!!
        try { await buttonResponse.deferUpdate(); } catch (e) {}
        if (buttonResponse.user == author) {
            switch (buttonResponse.customId) {
                case "home":
                    sleep(200).then( async () => {
                        await sendEmbedAndCollectResponses(
                            response,
                            await createServerSettingsEmbed(response),
                            guildData,
                            author,
                            'home'
                        );
                    });
                    break;

                case "features":
                    sleep(200).then( async () => {
                        await sendEmbedAndCollectResponses(
                            response,
                            await createServerFeatureEmbed(guildData, response),
                            guildData,
                            author,
                            'feature'
                        );
                    } );
                    break;

                case "commands":
                    response = await response.edit("Fetching command list, please wait...");                
                    sleep(200).then( async () => {
                        await sendEmbedAndCollectResponses(
                            response,
                            await createServerCommandEmbed(guildData, response),
                            guildData,
                            author,
                            'command'
                        );
                    } );
                    break;

                case "enable":
                    if (type == 'feature' && !ongoingEdit) {
                        ongoingEdit = true;   
                        await enableDisableFeature(response, guildData, author, true);

                    }
                    else if (type == 'command' && !ongoingEdit) {
                        ongoingEdit = true;
                        await enableDisableCommand(response, guildData, author, true);
                    }
                    break;
                case "disable":
                    if (type == 'feature' && !ongoingEdit) {
                        ongoingEdit = true;
                        await enableDisableFeature(response, guildData, author, false);
                    }
                    else if (type == 'command' && !ongoingEdit) {
                        ongoingEdit = true;
                        await enableDisableCommand(response, guildData, author, false);
                    }
                    break;
                case "done":
                    await response.delete();
                    
                    break;

            }
        }
    });

    buttonCollector.on('end', async endResponse => { await interaction.edit({content: "", embeds: [embed], components: []}); });
}

const enableDisableFeature = async (message: Message<boolean>, guildData: GuildDataInterface, author: User, enable: boolean) => {
    const reply = await message.reply(`Please enter the number corresponding to the feature you want to ${enable ? 'enable' : 'disable'}, or type 'cancel' to cancel.`);
    
    const messageCollectorFilter = (m: Message<boolean>) => m.author.id === author.id;
    const selectionCollector = reply.channel.createMessageCollector({filter: messageCollectorFilter, time: 60000});
    selectionCollector.on('collect', async messageResponse => {
        if (messageResponse.author == author) {
            const collectedMessage = messageResponse.content;
            if (collectedMessage == "cancel") {
                try { await messageResponse.delete(); } catch (e) {}
                await reply.delete();
            }
            else if(!Number.isNaN(Number(collectedMessage)) && Number(collectedMessage) > 0) {
                const receivedNumber = Number(collectedMessage);
                // Hardcoding features for now.
                switch (receivedNumber) {
                    // Wordle
                    case 1:
                        if (await areWordleFeaturesEnabled(guildData)) {
                            if (enable) await reply.edit({content: 'The Wordle feature is already enabled.'});
                            else await reply.edit({content: await disableWordleFeatures(guildData)});
                        } else {
                            if (!enable) await reply.edit({content: 'The Wordle feature is already disabled.'});
                            else await reply.edit({content: await enableWordleFeatures(guildData)});        
                        } 
                        break;
                    // Starboard
                    case 2:
                        if (await isStarboardEnabled(guildData)) {
                            if (enable) await reply.edit({content: 'The Starboard feature is already enabled.'});
                            else await reply.edit({content: await disableStarboardFeature(guildData)});
                        } else {
                            if (!enable) await reply.edit({content: 'The Starboard feature is already disabled.'});
                            else await reply.edit({content: await enableStarboardFeature(guildData)});        
                        } 
                        break;
                    // Twitter
                    case 3:
                        if (await isTwitterEmbedFixEnabled(guildData)) {
                            if (enable) await reply.edit({content: 'The Twitter Embed Fix feature is already enabled.'});
                            else await reply.edit({content: await toggleTwitterEmbedFix(guildData, false)});
                        } else {
                            if (!enable) await reply.edit({content: 'The Twitter Embed Fix feature is already disabled.'});
                            else await reply.edit({content: await toggleTwitterEmbedFix(guildData, true)});        
                        } 
                        break;
                    // Tiktok
                    case 4:
                        if (await isTikTokEmbedFixEnabled(guildData)) {
                            if (enable) await reply.edit({content: 'The TikTok Embed Fix feature is already enabled.'});
                            else await reply.edit({content: await toggleTikTokEmbedFix(guildData, false)});
                        } else {
                            if (!enable) await reply.edit({content: 'The TikTok Embed Fix feature is already disabled.'});
                            else await reply.edit({content: await toggleTikTokEmbedFix(guildData, true)});        
                        } 
                        break;
                    
                    // Instagram
                    case 5:
                        if (await isInstagramEmbedFixEnabled(guildData)) {
                            if (enable) await reply.edit({content: 'The Instagram Embed Fix feature is already enabled.'});
                            else await reply.edit({content: await toggleInstagramEmbedFix(guildData, false)});
                        } else {
                            if (!enable) await reply.edit({content: 'The Instagram Embed Fix feature is already disabled.'});
                            else await reply.edit({content: await toggleInstagramEmbedFix(guildData, true)});        
                        } 
                    
                    // Custom Responses
                    case 6:
                        if (await isCustomResponseEnabled(guildData)) {
                            if (enable) await reply.edit({content: 'The Custom Response feature is already enabled.'});
                            else await reply.edit({content: await toggleCustomResponse(guildData, false)});
                        } else {
                            if (!enable) await reply.edit({content: 'The Custom Response feature is already disabled.'});
                            else await reply.edit({content: await toggleCustomResponse(guildData, true)});        
                        } 
                        break;
                    default:
                        await reply.edit({content: 'Invalid number. Try again.'})
                        break;
                }
                try { await messageResponse.delete(); } catch (e) { }
            }
            ongoingEdit = false;
            return;
        }
    });
}

const enableDisableCommand = async (message: Message<boolean>, guildData: GuildDataInterface, author: User, enable: boolean) => {
   
    
    const reply = await message.reply(`Please enter the number corresponding to the command you want to ${enable ? 'enable' : 'disable'}, or type 'cancel' to cancel.`);

    const messageCollectorFilter = (m: Message<boolean>) => m.author.id === author.id;
    const selectionCollector = reply.channel.createMessageCollector({filter: messageCollectorFilter, time: 60000});
    selectionCollector.on('collect', async messageResponse => {
        if (messageResponse.author == author) {
            const collectedMessage = messageResponse.content;
            if (collectedMessage == "cancel") {
                try { await messageResponse.delete(); } catch (e) {}
                await reply.delete();
            }
            else if(!Number.isNaN(Number(collectedMessage)) && Number(collectedMessage) > 0) {
                const receivedNumber = Number(collectedMessage);
                if (receivedNumber > enabledCommandList.length) {
                    await reply.edit({content: "Invalid number. Try again."});
                } else {
                    let command: string | undefined = '';
                    let commandInterface;
                    // Enable
                    if (enable) {
                        command = disabledCommandList.at(receivedNumber - 1);
                        if (!command) return;
                        commandInterface = getCommandByName(command);

                    } else {
                        command = enabledCommandList.at(receivedNumber - 1);
                        if (!command) return;
                        commandInterface = getCommandByName(command);
                    }

                    let response = "";
                    try {
                        if (commandInterface == null) response = `${command} does not correspond to any command name. Try again.`;
                        else if (enable) response = await addEnabledCommand(commandInterface, guildData);
                        else response = await addDisabledCommand(commandInterface, guildData);
                        await reply.edit({content: response});
                    } catch (e) {
                        await reply.edit({content: "An error occurred when trying to make changes."});
                    }
                    try { await messageResponse.delete(); } catch (e) {}
                }
            }
            ongoingEdit = false;
            return;
        }
    });
}

const createServerCommandEmbed = async (guildData: GuildDataInterface, message: Message<boolean>) => {
    const embed: EmbedBuilder = new EmbedBuilder()
        .setTitle("💬 Command Configuration for " + message.guild?.name)
        .setDescription("Use the buttons below to enable/disable commands for this server.");
    let enabledCommandsString: string = '';
    let disabledCommandsString: string = '';
    
    let counter = 1;
    if (enabledCommandList.length > 0) {
        for (const command of enabledCommandList) {
            enabledCommandsString += `${counter}. ${command}\n`;
        }
    } else {
        enabledCommandsString = 'None';
    }

    if (disabledCommandList.length > 0) {
        counter = 1;
        for (const command of disabledCommandList) {
            disabledCommandsString += `${counter}. ${command}\n`;
        }
    } else {
        disabledCommandsString = 'None';
    }

    embed.addFields(
        {name: 'Enabled Commands', value: enabledCommandsString, inline: true},
        {name: 'Disabled Commands', value: disabledCommandsString, inline: true}
    );

    return embed;
}

const createServerFeatureEmbed = async (guildData: GuildDataInterface, message: Message<boolean>) => {
    const embed = new EmbedBuilder().setTitle("🧰 Feature Configuration for " + message.guild?.name);
    let contentScanningString: string = "Use the buttons below to enable/disable features for this server.\n\n";
    
    contentScanningString += "1. Wordle Results Scanning: ";
    if ( guildData.messageScanning.wordleResultScanning ) {
        contentScanningString += "**Enabled**\n";
    } else { contentScanningString += "**Disabled**\n"; }
    contentScanningString += " - Scans messages for pasted NYT Wordle/Connections results and keeps track of scores.\n"

    // Starboard
    contentScanningString += "2. Starboard Reaction Scanning: ";
    if ( guildData.messageScanning.starboardScanning ) {
        contentScanningString += "**Enabled**\n";
    } else { contentScanningString += "**Disabled**\n"; }
    contentScanningString += " - Scans reactions for a configurable emoji, and posts to a starboard channel (if configured).\n"

    // Twitter Embed Fix
    contentScanningString += "3. Twitter Embed Fix: ";
    if ( guildData.messageScanning.twitterEmbedFix ) {
        contentScanningString += "**Enabled**\n";
    } else { contentScanningString += "**Disabled**\n"; }
    contentScanningString += " - Scans messages for Twitter/X URLs and fixes broken video embeds.\n"

    // TikTok Embed Fix
    contentScanningString += "4. TikTok Embed Fix: ";
    if ( guildData.messageScanning.tiktokEmbedFix ) {
        contentScanningString += "**Enabled**\n";
    } else { contentScanningString += "**Disabled**\n"; }
    contentScanningString += " - Scans messages for TikTok URLs and fixes broken video embeds.\n"
    
    // Instagram Embed Fix
    contentScanningString += "5. Instagram Embed Fix: ";
    if ( guildData.messageScanning.instagramEmbedFix ) {
        contentScanningString += "**Enabled**\n";
    } else { contentScanningString += "**Disabled**\n"; }
    contentScanningString += " - Scans messages for TikTok URLs and fixes broken video embeds.\n"

    // Custom Response
    contentScanningString += "6. Custom Responses: ";
    if ( guildData.messageScanning.customResponse ) {
        contentScanningString += "**Enabled**\n";
    } else { contentScanningString += "**Disabled**\n"; }
    contentScanningString += " - Scans messages for configurable phrases, and responds with a user-defined reply (if configured).\n"

    embed.setDescription(contentScanningString);
    return embed;
}

// Main menu for server settings
const createServerSettingsEmbed = async (message: Message) => {
    const embed = new EmbedBuilder();
    embed.setTitle("🛠️ Configuration for " + message.guild?.name);

    let description: string = "Welcome to the settings menu.\nHere, you can enable or disable features (like message scanning) or individual commands for this server.\n";
    description += "- **Features** are behaviors that run in the background, like scanning for wordle results, and sometimes require additional permissions to be given to the bot.\n";
    description += "- Some commands/features are enabled by default, and some are disabled by default.\n";
    description += "- In order to enable a command or feature, you must have the `Manage Server` permission.\n";
    description += "\nUsing the buttons below, select whether you want to modify features or settings."
    
    embed.setDescription(description);
    if (message.guild?.iconURL()) embed.setThumbnail(message.guild?.iconURL());
    
    return embed;
}




/* Example usage:
    /settings enableCommand poke
    /settings disableCommand avatar
    /settings enableFeature wordle


*/
export const guildSettings: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('View and modify  bot settings')
        
        // List guild settings
        .addSubcommand((subcommand) =>
            subcommand
                .setName('server')
                .setDescription('View settings for this server')
        )


        ,
    run: async (interaction) => {
        // Disable context menu
        if (!interaction.isChatInputCommand()) {
            await interaction.editReply('This command cannot be used in a context menu');
            return;
        }

        switch (interaction.options.getSubcommand()) {
            // Disable DMS
            case 'server':
                if (!interaction.guildId || !interaction.guild) {
                    await interaction.editReply('This command cannot be used in DMs');
                    return;
                }
        
                const message: Message<boolean> = await interaction.editReply("Fetching guild settings, please wait...");
                const guildData: GuildDataInterface = await getGuildDataByGuildID(interaction.guildId);
                enabledCommandList = await getEnabledCommandListAsString(guildData, true);
                disabledCommandList = await getDisabledCommandListAsString(guildData, true);
                await sendEmbedAndCollectResponses(
                    message, 
                    await createServerSettingsEmbed(message), 
                    guildData, 
                    interaction.user,
                    'home'
                );
                break;
        }    

    },
    properties: {
        Name: 'Settings',
        Aliases: [],
        Scope: 'global',
        GuildOnly: true,
        Enabled: true,
        DefaultEnabled: true,
        Intents: [],
        CanBeDisabled: false
    }
}
