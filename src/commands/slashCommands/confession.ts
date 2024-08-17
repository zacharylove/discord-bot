// Confessions
// TODO: make modal
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, CommandInteraction, ComponentType, EmbedBuilder, Message, MessageActionRowComponentBuilder, MessageCollector, PermissionsBitField, SlashCommandBuilder, TextChannel, User } from 'discord.js';
import { CommandInterface, Feature } from '../../interfaces/Command.js';
import { addConfessionToApprovalQueue, approveConfession, getConfessionNumber, getGuildDataByGuildID, removeConfessionFromApprovalQueue, update } from '../../database/guildData.js';
import { hasPermissions } from '../../utils/userUtils.js';
import { CommandStatus, broadcastCommandStatus } from '../../utils/commandUtils.js';
import { Confession, GuildDataInterface } from '../../database/models/guildModel.js';
import { confirmationMessage, getChannelFromString, getCurrentUTCDate, sleep, truncateString } from '../../utils/utils.js';
import { randomUUID } from 'crypto';
import { BOT } from '../../index.js';

export const postConfession = async (confession: Confession, guildData: GuildDataInterface) => {
   
    const footers = [
        "To create a confession of your own, run /confess",
        "Confessions are not logged or saved anywhere",
    ];
    const approvalFooters = [
        "Anonymous confessions are reviewed by mods before being posted",
        "To create a confession of your own, run /confess",
        "Confessions are 100% anonymous, but you can still get banned through them"
    ]
    
    let embedToSend: EmbedBuilder = new EmbedBuilder();
    let message: string = "";
    embedToSend
        .setTitle('Anonymous Confession #' + getConfessionNumber(guildData))
        .setDescription(`"${confession.message}"`)
        .setTimestamp(confession.timestamp)
        .setFooter({text: guildData.channels.confessionApprovalChannelId != "" ? approvalFooters[Math.floor(Math.random()*approvalFooters.length)] : footers[Math.floor(Math.random()*footers.length)]});

    // Attach image if provided
    const imageString = confession.imageURL;
    if ( imageString ) {
        embedToSend.setImage(imageString);
    }
    // Ping user if one is provided
    const userToPing = confession.mentionedUserId;
    if ( userToPing ) {
        message += `<@${userToPing}> 👀`;
    }
    // Set color to random
    embedToSend.setColor(Math.floor(Math.random()*16777215));

    const confessionChannel = await BOT.channels.cache.get(guildData.channels.confessionChannelId);
    if (!confessionChannel) console.error(`ERROR: Confession channel ${guildData.channels.confessionChannelId} does not exist!`);
    else {
        await (<TextChannel> confessionChannel).send({content: message, embeds: [embedToSend]});
    }
}

const createApprovalEmbed = async (id: string, confession: Confession, guildData: GuildDataInterface) => {
    let interaction;
    const approvalChannel = await BOT.channels.cache.get(guildData.channels.confessionApprovalChannelId);
    if (!approvalChannel) {
        console.error(`Error: Confession approval channel ${guildData.channels.confessionApprovalChannelId} does not exist!`)
        return;
    }
    else { 
        interaction = await (<TextChannel> approvalChannel).send({content: 'New confession approval request!'});
    }
    let description = confession.message;
    const embed = new EmbedBuilder()
        .setTitle("😶 Confession Approval")
        .setTimestamp(confession.timestamp)
        .setFooter({text: id})
        ;
    const imageString = confession.imageURL;
    if ( imageString ) {
        embed.setImage(imageString);
    }

    let message = "Choose an action to take on this anonymous confession.";

    // Ping user if one is provided
    const userToPing = confession.mentionedUserId;
    if ( userToPing ) {
        description += `\n(Mentions ${userToPing})`;
    }
    embed.setDescription(description)


    const row: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();
    const approveButton = new ButtonBuilder()
        .setLabel("Approve")
        .setStyle(ButtonStyle.Success)
        .setCustomId('approve');
    row.addComponents(approveButton);

    const denyButton = new ButtonBuilder()
        .setLabel("Deny")
        .setStyle(ButtonStyle.Primary)
        .setCustomId('deny');
    row.addComponents(denyButton);

    const banButton = new ButtonBuilder()
        .setLabel("Ban")
        .setStyle(ButtonStyle.Danger)
        .setCustomId('ban');

    if (!interaction.member?.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        message += "\nNote: I currently do not have permission to ban members.";
        banButton.setDisabled(true);
    }
    row.addComponents(banButton);

    let response: Message<boolean> = await interaction.edit({content: message, embeds: [embed], components: [row]});
    try {
        // Filter to any user with admin
        const buttonCollector = response.createMessageComponentCollector({ componentType: ComponentType.Button});
        let collected: boolean = false;

        buttonCollector.on('collect', async buttonResponse => {
            try { await buttonResponse.deferUpdate(); } catch (e) {}
            if (
                !collected &&
                hasPermissions(PermissionsBitField.Flags.ManageGuild, buttonResponse.guild!, buttonResponse.user) || 
                hasPermissions(PermissionsBitField.Flags.BanMembers, buttonResponse.guild!, buttonResponse.user)) 
            {
                // In case some time has passed and guild data has updated, we refetch
                guildData = await getGuildDataByGuildID(buttonResponse.guildId!);
                let messageCollectorFilter;
                let member = await buttonResponse.guild?.members.fetch(confession.userId);
                let selectionCollector: MessageCollector;
                switch (buttonResponse.customId) {
                    case 'approve':
                        collected = true;
                        const confessionNumber = await approveConfession(guildData, id);
                        await buttonResponse.followUp({content: `Confession #${confessionNumber+1} approved by <@${buttonResponse.user.id}>.`});
                        try { await response.delete() } catch (e) {}
                        await postConfession(confession, guildData);
                        break;
                    case 'deny':
                        collected = true;
                        let denialMessage = "";
                        if (member != undefined) {
                            const messageCollectorFilter = (m: Message<boolean>) => m.author.id === buttonResponse.user.id;

                            await buttonResponse.followUp({content:"Do you want to send a denial message to the author? (Y/N)", ephemeral: true, fetchReply: true})
                            .then(() => {
                                buttonResponse.channel?.awaitMessages({filter: messageCollectorFilter, max: 1, time: 60000})
                                .then( (collected) => {
                                    let messageResponse = collected.first();
                                    if (messageResponse) {
                                        let collectedMessage = messageResponse.content;
                                        if (collectedMessage && collectedMessage.toLowerCase() == 'y') {
                                            return messageResponse.reply({content: "Okay, send your message now."})
                                        }
                                    }
                                    return null;
                                })
                                .then((followUpResponse) => {
                                    if (!followUpResponse) return "";
                                    buttonResponse.channel?.awaitMessages({filter: messageCollectorFilter, max: 1, time: 60000})
                                    .then( (collected): string => {
                                        let messageResponse = collected.first();
                                        if (messageResponse) {
                                            let collectedMessage = messageResponse.content;
                                            if (collectedMessage && collectedMessage.length > 0) {
                                                if (followUpResponse != undefined) {
                                                    try { followUpResponse.delete(); } catch (e) {}
                                                }
                                                return collectedMessage;
                                            }
                                        }
                                        return "";
                                    }).then((denialMessage) => {
                                        removeConfessionFromApprovalQueue(guildData, id);
                                        buttonResponse.followUp({content: `Confession "${truncateString(confession.message, 15)}" denied by <@${buttonResponse.user.id}>${denialMessage != "" ? ` with reason "${denialMessage}".` : "."}`});
                                        try { response.delete() } catch (e) {}
    
                                        //Send denial message
                                        if (member != undefined) {
                                            let dmMessage = `Your confession "${truncateString(confession.message, 1500)}" was vetoed by a moderator and will not be posted.`;
                                            if (denialMessage != "") dmMessage += `\n**Reason**: ${denialMessage}`;
                                            member.send({content: dmMessage});
                                        }
                                    })
                                })
                            });
                        }

                        
                        
                        break;
                    case 'ban':
                        collected = true;
                        if (member == undefined) {
                            await buttonResponse.followUp({content: `Could not find the author of "${truncateString(confession.message, 15)}". They may have left the server.`});
                            break;
                        }
                        const followUp = await buttonResponse.followUp({content: `Confirm banning author of "${truncateString(confession.message, 15)}"? Type "ban" in chat to confirm, anything else to cancel.`});
                        messageCollectorFilter = (m: Message<boolean>) => m.author.id === buttonResponse.user.id;
                        selectionCollector = buttonResponse.channel!.createMessageCollector({ filter: messageCollectorFilter, time: 60000});
                        let messageCollected: boolean = false;
                        try {
                            selectionCollector.on('collect', async messageResponse => {
                                if (messageResponse.author.id == buttonResponse.user.id && !collected) {
                                    let collectedMessage = messageResponse.content;
                                    if (collectedMessage.toLowerCase() == 'ban') {
                                        await followUp.edit({content: `Author of "${truncateString(confession.message, 15)}" was banned by <@${messageResponse.author.id}>.`});
                                        await member.ban();
                                    } else {
                                        await selectionCollector.emit('end');
                                    }
                                }
                            });
                        } catch (e) {
                            await followUp.edit({content: `An error occurred while waiting for your message.`});
                            console.debug(`Error: ${e}`);
                        }
                        break;
                }
            }
        });
    } catch (e) {
        console.debug(`Error: ${e}`);
    }
}

const createNewConfession = async (interaction: CommandInteraction) => {
    if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.guild || !interaction.channel) {
        await broadcastCommandStatus(interaction, CommandStatus.CriticallyFailed, {command: confess, reason: "Invalid interaction!"});
        return;
    }

    if ( interaction.options.getString('confession') == null ) {
        await interaction.editReply('You must provide a confession!');
        return;
    }
    const guildData = await getGuildDataByGuildID(interaction.guildId);

    // Check if the channel is the confession channel
    var confessionChannelID = guildData.channels.confessionChannelId;
    // Get confession number
    var confessionNumber = guildData.counters.numConfessions;
    var dataUpdated: boolean = false;
    if ( guildData.counters.numConfessions == null ) {
        guildData.counters.numConfessions, confessionNumber = 1;
        dataUpdated = true;
    }
    if (guildData.channels.confessionChannelId == null) {
        guildData.channels.confessionChannelId,confessionChannelID = "";
        dataUpdated = true;
    }
    if (dataUpdated) update(guildData);
    if ( confessionChannelID == "" ) {
        await interaction.editReply('The confession channel has not been set up for this server yet! Run /confess channel to set it up.');
        return;
    }
    if (guildData.confession.confessionsEnabled == undefined || !guildData.confession.confessionsEnabled) {
        await interaction.editReply('Confessions are disabled for this server.');
        return;
    }

    
    // Get confession content
    const imageString = interaction.options.getString('image');
    const userToPing = interaction.options.getUser('user');
    const confession = {
        userId: interaction.user.id,
        message: interaction.options.getString('confession'),
        imageURL: imageString ? imageString : undefined,
        mentionedUserId: userToPing ? userToPing : undefined,
        timestamp: getCurrentUTCDate()
    } as Confession;
    // If approval is enabled, add to approval queue- otherwise post
    if (
        guildData.confession.approvalRequired != undefined && 
        guildData.confession.approvalRequired == true &&
        guildData.channels.confessionApprovalChannelId != "" && 
        guildData.channels.confessionApprovalChannelId != undefined
    ) {
        const confessionId = randomUUID();
        await addConfessionToApprovalQueue(guildData, confessionId, confession);
        await createApprovalEmbed(confessionId, confession, guildData);
        await interaction.editReply(`Confession recieved! When approved by a moderator, it will appear in <#${guildData.channels.confessionChannelId}>.`);
        return;
    } else {
        await interaction.editReply(`Confession recieved!`);
        await postConfession(confession, guildData)
    }
}

export const createConfessionSettingsEmbed = async (interaction: Message<boolean>, guildData: GuildDataInterface): Promise<EmbedBuilder> => {   
    const embed = new EmbedBuilder()
        .setTitle(`😶 Confession settings for ${interaction.guild?.name}`)
        .setAuthor({name: `Confession Status: ${guildData.channels.confessionChannelId != "" ? "ENABLED" : "DISABLED"}`});
        ;

    let description = "Welcome to the confession settings menu.\n";
    description += "Here, you can customize how confessions work for your server.\n";
    description += "Press the buttons below to set channels for confessions and confession approval:\n";
    embed.setDescription(description);

    let confessionSetting = "The Confession Channel is the text channel that new confessions will be posted to.\nIf a confession channel is not set, confessions will be disabled.\n";
    confessionSetting += "- **Confessions Enabled**: ";
    if (guildData.channels.confessionChannelId != "") {
        confessionSetting += "`YES`\n";
        confessionSetting += `- **Confession Channel**: <#${guildData.channels.confessionChannelId}>\n`;
    } else {
        confessionSetting += "`NO`\n";
        confessionSetting += `- **Confession Channel**: NONE\n`;
    }

    let approvalSetting = "The Approval Channel is the text channel where confessions will be initially posted require approval by a mod before they are posted to the confessions channel.\nIf an approval channel is not set, confessions will be posted without moderation.\n";
    approvalSetting += "- **Approval Required**: ";
    if (guildData.channels.confessionApprovalChannelId != "") {
        approvalSetting += "`YES`\n";
        approvalSetting += `- **Approval Channel**: <#${guildData.channels.confessionApprovalChannelId}>\n`;
    } else {
        approvalSetting += "`NO`\n";
        approvalSetting += `- **Approval Channel**: NONE\n`;
    }
    embed.addFields([
        {
            name: "Confession Settings",
            value: confessionSetting,
            inline: true
        },
        {
            name: "Approval Settings",
            value: approvalSetting,
            inline: true
        }
    ]);

    return embed;

}

const sendReplyAndCollectResponses = async (
    interaction: ButtonInteraction<CacheType>,
    guildData: GuildDataInterface,
    type: "confession" | "approval",
    authorId: string
): Promise<GuildDataInterface> => {
    let replyMessage = `Please send a message tagging the channel you would like to set as the ${type} channel for this server`;
    await interaction.followUp({ content: replyMessage, ephemeral: true});
    const messageCollectorFilter = (m: Message<boolean>) => m.author.id === authorId;
    
    const selectionCollector = interaction.channel!.createMessageCollector({ filter: messageCollectorFilter, time: 60000});
    let collected: boolean = false;
    try {
        selectionCollector.on('collect', async messageResponse => {
            if (messageResponse.author.id == authorId && !collected) {
                collected = true;
                let collectedMessage = messageResponse.content;
                const channel = await getChannelFromString(collectedMessage, messageResponse.guild!);
                // If still invalid, bad channel
                if (channel == null) {
                    await messageResponse.reply({content: "I can't find that channel. Try again."});
                } else {
                    await messageResponse.reply({content: `${confirmationMessage()} the ${type} channel has been set to <#${channel.id}>.`});
                    if (type == "approval") guildData.channels.confessionApprovalChannelId = channel.id;
                    else guildData.channels.confessionChannelId = channel.id;
                    await update(guildData);
                    selectionCollector.stop();
                }
            }
        });
    } catch (e) {
        console.debug(`Error: ${e}`);
    }
    return guildData;
}

const buildButtons = async (
    confessionsEnabled: boolean,
    approvalEnabled: boolean
): Promise<ActionRowBuilder<MessageActionRowComponentBuilder>[]> => {
    const firstButtonRow: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();
    const secondButtonRow: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();

    const enableDisableConfessionsButton = new ButtonBuilder()
        .setLabel(confessionsEnabled ? "Disable Confessions" : "Enable Confessions")
        .setStyle(confessionsEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
        .setEmoji(confessionsEnabled ? {name: "✖️"} : {name: "✔️"})
        .setCustomId('toggleconfessions');
    firstButtonRow.addComponents(enableDisableConfessionsButton);

    const enableDisableApprovalButton = new ButtonBuilder()
        .setLabel("Require Approval")
        .setStyle(approvalEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
        .setEmoji(approvalEnabled ? {name: "✖️"} : {name: "✔️"})
        .setCustomId('toggleapproval');
    firstButtonRow.addComponents(enableDisableApprovalButton);

    const confessionChannelButton = new ButtonBuilder()
        .setLabel("Set Confession Channel")
        .setStyle(ButtonStyle.Primary)
        .setCustomId('confessionchannel');
    secondButtonRow.addComponents(confessionChannelButton);

    const approvalChannelButton = new ButtonBuilder()
        .setLabel("Set Approval Channel")
        .setStyle(ButtonStyle.Primary)
        .setCustomId('approvalchannel');
    secondButtonRow.addComponents(approvalChannelButton);
    const doneButton = new ButtonBuilder()
        .setCustomId('done')
        .setLabel('Done')
        .setStyle(ButtonStyle.Secondary)
    ;
    secondButtonRow.addComponents(doneButton);

    return [firstButtonRow, secondButtonRow]
}

export const sendConfessionSettingsEmbedAndCollectResponses = async (
    interaction: Message<boolean>,
    embed: EmbedBuilder,
    guildData: GuildDataInterface,
    authorId: string,
    selectRow: ActionRowBuilder<MessageActionRowComponentBuilder>
) => {
    let confessionsEnabled = guildData.confession.confessionsEnabled != undefined && guildData.confession.confessionsEnabled ? true : false;
    let approvalEnabled = guildData.confession.approvalRequired != undefined && guildData.confession.approvalRequired ? true : false;

    let buttons = await buildButtons(
        confessionsEnabled,
        approvalEnabled
    );
    

    let response: Message<boolean> = await interaction.edit({content: "", embeds: [embed], components: [selectRow, buttons[0], buttons[1]]});
    try {
        const buttonCollectorFilter = (i: { user: { id: string; }; }) => i.user.id === authorId;
        const buttonCollector = response.createMessageComponentCollector({ componentType: ComponentType.Button, filter: buttonCollectorFilter, time: 60000});
        let collected: boolean = false;

        buttonCollector.on('collect', async buttonResponse => {
            try { await buttonResponse.deferReply() } catch (e) {}
            if (buttonResponse.user.id == authorId && !collected) {
                switch (buttonResponse.customId) {
                    case 'toggleconfessions':
                        collected = true;
                        confessionsEnabled = !confessionsEnabled;
                        await buttonResponse.followUp({content: `${confirmationMessage()} the confession feature is now ${confessionsEnabled ? "enabled" : "disabled"}.`, ephemeral: true});
                        guildData.confession.confessionsEnabled = confessionsEnabled;
                        await update(guildData);
                        try {
                            buttons = await buildButtons(confessionsEnabled, approvalEnabled);
                            await response.edit({content: "", embeds: [embed], components: [selectRow, buttons[0], buttons[1]]});
                        } catch (e) {}
                        sleep(200).then (() => collected = false);
                        break;

                    case 'toggleapproval':
                        collected = true;
                        approvalEnabled = !approvalEnabled;
                        await buttonResponse.followUp({content: `${confirmationMessage()} new confessions will ${approvalEnabled ? "require" : "not need"} approval by a moderator.`, ephemeral: true});
                        guildData.confession.approvalRequired = approvalEnabled;
                        await update(guildData);
                        try {
                            buttons = await buildButtons(confessionsEnabled, approvalEnabled);
                            await response.edit({content: "", embeds: [embed], components: [selectRow, buttons[0], buttons[1]]});
                        } catch (e) {}
                        sleep(200).then (() => collected = false);
                        break;

                    case 'confessionchannel':
                        collected = true;
                        sleep(200).then( async () => {
                            return await sendReplyAndCollectResponses(buttonResponse, guildData, "confession", authorId)
                        }).then(async (guildData) =>  {
                            try {
                                embed = await createConfessionSettingsEmbed(response, guildData);
                                await response.edit({content: "", embeds: [embed], components: [selectRow, buttons[0], buttons[1]]});
                            } catch (e) {}
                        });
                        break;
                    case 'approvalchannel':
                        collected = true;
                        sleep(200).then( async () => 
                            guildData = await sendReplyAndCollectResponses(buttonResponse, guildData, "approval", authorId)
                        ).then(() => sleep(1000)).then (async () => {
                            try {
                                embed = await createConfessionSettingsEmbed(response, guildData);
                                await response.edit({content: "", embeds: [embed], components: [selectRow, buttons[0], buttons[1]]});
                            } catch (e) {}
                        });
                        break;
                    case 'done':
                        collected = true;
                        sleep(200).then( async () => {await response.delete();})
                        break;
                }
                
            }
        });
    } catch (e) {
        console.debug(`Error: ${e}`);
    }
}

export const confess: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('confess')
        .setDescription('Confess something anonymously in a designated confession channel!')
        .addStringOption((option) =>
            option
                .setName('confession')
                .setDescription('Your confession')
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName('image')
                .setDescription('An image to attach to your confession (URLs only)')
                .setRequired(false)
        )
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to confess to (will ping them)')
                .setRequired(false)
        )
        ,
    run: async (interaction) => {
        // Disable context menu
        if (!interaction.isChatInputCommand()) {
            await interaction.editReply('This command cannot be used in a context menu');
            return;
        }
        // Disable DMS
        if (!interaction.guildId || !interaction.guild || !interaction.channel) {
            await interaction.editReply('This command cannot be used in DMs');
            return;
        }
        switch ( interaction.options.getSubcommand() ) {
            case 'new':
                await createNewConfession(interaction);
                break;
        }

        return;
    },
    properties: {
        Name: 'Confessions',
        Scope: 'global',
        GuildOnly: true,
        DefaultEnabled: true,
        Enabled: true,
        Permissions: [],
        Ephemeral: true,
        Feature: Feature.Confession
    }
}