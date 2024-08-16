import { ButtonInteraction, ButtonStyle, CacheType, CommandInteraction, ComponentType, EmbedBuilder, GuildMemberRoleManager, Message, Options, PermissionsBitField, SlashCommandBuilder, TextChannel, TextInputBuilder, TextInputStyle } from "discord.js";
import { CommandInterface } from "../../interfaces/Command.js";
import { CommandStatus, broadcastCommandStatus } from "../../utils/commandUtils.js";
import { hasPermissions } from "../../utils/userUtils.js";
import { getGuildDataByGuildID, update } from "../../database/guildData.js";
import { confirmationMessage, getChannelFromString, getRoleFromString, sleep } from "../../utils/utils.js";
import { addThread } from "../../database/internalData.js";
import { ActionRowBuilder, ButtonBuilder, MessageActionRowComponentBuilder, ModalActionRowComponentBuilder, ModalBuilder } from "@discordjs/builders";
import { GuildDataInterface } from "../../database/models/guildModel.js";
import { BOT } from "../../index.js";


const createNewQotd = async (interaction: CommandInteraction) => {
    if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.guild || !interaction.channel) {
        await interaction.deferReply({ephemeral: true});
        await broadcastCommandStatus(interaction, CommandStatus.CriticallyFailed, {command: qotd, reason: "Invalid interaction!"});
        return;
    }
    
    const guildId = interaction.guildId;
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId('qotd')
        .setTitle("Question of the Day");
    
    // Question component
    const questionInput = new TextInputBuilder()
        .setCustomId('questionInput')
        .setLabel("What is your question?")
        // Paragraph means multiple lines of text.
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const questionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
        .addComponents(questionInput);
    // Image component
    const imageInput = new TextInputBuilder()
        .setCustomId('imageInput')
        // The label is the prompt the user sees for this input
        .setLabel("Add an image URL (optional)")
        // Short means only a single line of text
        .setPlaceholder("https://example.com/image.png")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
    const imageRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
        .addComponents(imageInput);

    modal.addComponents(questionRow);
    modal.addComponents(imageRow);

    await interaction.showModal(modal);

    await interaction.awaitModalSubmit({
        // Timeout after a minute of not receiving any valid Modals
        time: 300000,
        // Make sure we only accept Modals from the User who sent the original Interaction we're responding to
        filter: i => {
            // All interactions must be deferred, even ones that do not match filter
            i.deferUpdate();
            return i.user.id === interaction.user.id
        },
    }).then(async submitted => {
        if (!interaction.channel) return;

        const guildData = await getGuildDataByGuildID(guildId);
        if (guildData.channels.qotdChannelId == null || guildData.channels.qotdChannelId == "" ) {
            await submitted.followUp({content: 'No QOTD channel has been configured for this server! Have a mod run `/qotd setup` to set a channel.', ephemeral: true});
            return;
        }
        if (guildData.qotd.qotdWhitelist == null) {
            await submitted.followUp({ content: "QOTD has been improperly set up- this shouldn't happen! Try running `/qotd setup` again and if this happens again contact inco.", ephemeral: true});
            return;
        } else if (guildData.qotd.qotdWhitelist == true) {
            if (guildData.qotd.whitelistedRoleIds.length == 0) {
                await submitted.followUp({ content: 'The QOTD whitelist is enabled, but no roles are whitelisted! Have a mod run `qotd addrole` to add some authorized roles.', ephemeral: true});
                return;
            }
            // Check if calling user has the correct role (if whitelisted)
            if (interaction.inGuild()) {
                const roles: string[] | GuildMemberRoleManager = interaction.member.roles;
                let authorized: boolean = false;
                if (Array.isArray(roles)) {
                    for (const role of guildData.qotd.whitelistedRoleIds) {
                        if (roles.includes(role)) {
                            authorized = true;
                            break;
                        }
                    }
                } else {
                    for (const role of guildData.qotd.whitelistedRoleIds) {
                        if (roles.cache.has(role)) {
                            authorized = true;
                            break;
                        }
                    }
                }

                if (!authorized) {
                    await submitted.followUp({content: 'You are not authorized to post new QOTDs. Ask a mod to add your role to the whitelist.', ephemeral: true});
                    return;
                }
                
                
            }
        }


        // Create the qotd message
        const question = submitted.fields.getTextInputValue('questionInput');
        if (question == "") return;
        let qotdNumber = guildData.counters.numQotdPosts;
        if (guildData.counters.numQotdPosts == null) {
            guildData.counters.numQotdPosts, qotdNumber = 1;
            update(guildData)
        }

        let embed: EmbedBuilder = new EmbedBuilder()
            .setTitle(`Question of the Day #${qotdNumber}`)
            .setDescription(question)
            .setFooter({text: 'To create a QOTD of your own, run `/qotd new`'});
        
        // Attach image if provided
        const imageString = submitted.fields.getTextInputValue('imageInput');
        if (imageString) embed.setImage(imageString);

        // Set author
        embed.setAuthor({
            name: `${interaction.user.displayName != interaction.user.username ? `${interaction.user.displayName} (${interaction.user.username})` : interaction.user.username}`,
            iconURL: interaction.user.displayAvatarURL()
        });

        // Set color to random
        embed.setColor(Math.floor(Math.random()*16777215));

        // Create ping
        let message = "";
        if (guildData.qotd.qotdRole != null && guildData.qotd.qotdRole != "") message = `<@&${guildData.qotd.qotdRole}>`;

        const qotdMessage = await interaction.channel.send({content: message, embeds: [embed]});

        // Try to open thread
        if (interaction.channel.isTextBased() && interaction.channel instanceof TextChannel) {
            try {
                const threadChannel = await qotdMessage.startThread({
                    name: `QOTD #${qotdNumber}`,
                    autoArchiveDuration: 1440, // Archive after 24h
                    reason: `${interaction.user.username}'s question of the day`
                });
                console.debug(`Added thread ${threadChannel.id} to internal data.`);
                await addThread(threadChannel.id, interaction.channel.id, "qotd");
                try {
                    await threadChannel.members.add(interaction.user.id);
                } catch (e) {
                    console.log(`Error adding user ${interaction.user.id} to thread ${threadChannel.id}: ${e}`);
                    return;
                }

                // Send starting message
                await threadChannel.send({ content: 'Post your replies here!' });
            } catch (e) {
                console.log(`Failed to create thread for ${interaction.user.username}'s QOTD.`);
            }
        }


        // Increment numQOTD
        guildData.counters.numQotdPosts = qotdNumber + 1;
        await update(guildData);

    }).catch(error => {
        console.error(error);
        interaction.followUp({ content: "An error occurred while processing your qotd request.", ephemeral: true });
        return;
    });
}

const createWhitelistMessage = ( whitelist: string[], interaction: CommandInteraction): string => {
    if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.guild || !interaction.channel) {
        broadcastCommandStatus(interaction, CommandStatus.CriticallyFailed, {command: qotd, reason: "Invalid interaction!"});
        return "";
    }
    let message = "**Whitelist:**\n- ";
    const roleNames = [];
    for (const role of whitelist) {
        roleNames.push(interaction.guild.roles.cache.get(role));
    }
    message += roleNames.join("\n- ")
    return message;
}

const addRemoveRole = async (interaction: CommandInteraction, add: boolean) => {
    if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.guild || !interaction.channel) {
        await broadcastCommandStatus(interaction, CommandStatus.CriticallyFailed, {command: qotd, reason: "Invalid interaction!"});
        return;
    }
    const role = interaction.options.getRole('role');
    if (role == null) {
        await interaction.editReply('No role was provided!');
        return;
    }
    

    // Must be a mod
    if ( !hasPermissions(PermissionsBitField.Flags.ManageGuild, interaction.guild, interaction.user) ) {
        await interaction.editReply('You must be a mod to use this command!');
        return;
    }

    const guildData = await getGuildDataByGuildID(interaction.guildId);
    if (guildData.qotd.whitelistedRoleIds == null) {
        await interaction.editReply(`QOTD has not yet been set up for this server! Run \`\/qotd setup\` to get started.`);
        return;
    }
    if (add) {
        let whitelistMessage = createWhitelistMessage(guildData.qotd.whitelistedRoleIds, interaction);
        if (guildData.qotd.whitelistedRoleIds.includes(role.id)) {
            await interaction.editReply(`The role ${role.name} is already whitelisted!\n${whitelistMessage}`);
            return;
        }
        guildData.qotd.whitelistedRoleIds.push(role.id);
        whitelistMessage += `${role.name}`;
        await interaction.editReply(`Members with the role ${role.name} are now allowed to post QOTDs.\n${whitelistMessage}`);   
    } else {
        let whitelistMessage = createWhitelistMessage(guildData.qotd.whitelistedRoleIds.filter(r => r != role.id), interaction);
        if (!guildData.qotd.whitelistedRoleIds.includes(role.id)) {
            await interaction.editReply(`The role ${role.name} is not whitelisted!\n${whitelistMessage}`);
            return;
        }
        guildData.qotd.whitelistedRoleIds = guildData.qotd.whitelistedRoleIds.splice(guildData.qotd.whitelistedRoleIds.indexOf(role.id, 0), 1);
        await interaction.editReply(`Members with the role ${role.name} are no longer allowed to post QOTDs.\n${whitelistMessage}`);   
    }
    await update(guildData);
}


const createQotdSettingsEmbed = async (interaction: Message<boolean>, guildData: GuildDataInterface, qotdEnabled: boolean): Promise<EmbedBuilder> => { 
    const embed = new EmbedBuilder()
        .setTitle(`❔ Question of the Day Settings for ${interaction.guild?.name}`)
        .setAuthor({name: `QOTD Status: ${qotdEnabled ? "ENABLED": "DISABLED"}`});

    let description = "Welcome to the QOTD settings menu.\n";
    description += `A QOTD (or "Question of the Day") is a daily user-submitted question appearing in a designated channel that members can reply to.\n`;
    description += `\nHere, you can set up and customize the following for this server's QOTDs:\n`;
    description += `- The text channel where new QOTDs are posted\n`
    description += `- (Optional) A role to ping when a new QOTD is posted\n`;
    description += `- (Optional) A whitelist of roles that can post new QOTDs\n`;
    description += `- (Optional) Whether to open a new thread for each QOTD's responses\n`;

    description += `\nPress the buttons below to modify your settings.`;
    embed.setDescription(description);

    let qotdSetting = `- **QOTD Enabled**: ${qotdEnabled}\n`;
    qotdSetting += `- **Whitelist Enabled**: ${guildData.qotd.qotdWhitelist}\n`;
    qotdSetting += `- **# Whitelisted Roles**: ${guildData.qotd.whitelistedRoleIds ? guildData.qotd.whitelistedRoleIds.length: 0}\n`;
    qotdSetting += `- **Ping Role**: ${guildData.qotd.qotdRole != "" ? `<@&${guildData.qotd.qotdRole}>` : "NONE"}\n`;
    embed.addFields({name: "QOTD Settings", value: qotdSetting});

    return embed;
}  

const sendReplyAndCollectResponses = async (
    interaction: ButtonInteraction<CacheType>,
    guildData: GuildDataInterface,
    type: string,
    authorId: string,
    whitelistEnabled: boolean,
    qotdEnabled: boolean
) => {
    let replyMessage = "";
    const messageCollectorFilter = (m: Message<boolean>) => m.author.id === authorId;

    switch (type) {
        case 'roleping':
            replyMessage = `Send a message tagging the role you would like to ping when a new QOTD is posted.`;
            replyMessage += `\nSay "none" to disable role pinging, or "cancel" to cancel.`
            await interaction.followUp({ content: replyMessage, ephemeral: true });
            break;
        case 'enabledisable':
            if (qotdEnabled) {
                guildData.channels.qotdChannelId = "";
                await update(guildData);
                await interaction.followUp({content: `${confirmationMessage()} the QOTD feature is now disabled.`, ephemeral: true});
                return;
            } else {
                await interaction.followUp({content: `Send a message tagging the text channel you would like to use as the QOTD channel, or say "cancel" to cancel.`, ephemeral: true});
                break;
            }
    }
    const selectionCollector = interaction.channel!.createMessageCollector({ filter: messageCollectorFilter, time: 60000});
    let collected: boolean = false;
    try {
        selectionCollector.on('collect', async messageResponse => {
            if (messageResponse.author.id == authorId && !collected) {
                collected = true;
                let collectedMessage = messageResponse.content;
                if (collectedMessage.toLowerCase() == "cancel") {
                    await selectionCollector.emit('end');
                    return;
                }
                switch (type) {
                    case 'roleping':
                        if (collectedMessage.toLowerCase() == "none") {
                            await messageResponse.reply({content: `${confirmationMessage()} new QOTD posts will not ping anyone.${guildData.channels.qotdChannelId == "" ? "\n**NOTE: QOTD is currently disabled. Enable it through `/settings guild`.**" : ""}`});
                            guildData.qotd.qotdRole = "";
                            await update(guildData);
                            await selectionCollector.emit('end');
                            return;
                        }
                        const role = await getRoleFromString(collectedMessage, messageResponse.guild!, BOT);
                        if (role == null) {
                            await messageResponse.reply({content: "I can't find that role. Try again."});
                        } else {
                            await messageResponse.reply({content: `${confirmationMessage()} new QOTD posts will now ping <@&${role}>.${guildData.channels.qotdChannelId == "" ? "\n**NOTE: QOTD is currently disabled. Enable it through `/settings guild`.**" : ""}`, allowedMentions: { parse: [] } });
                            guildData.qotd.qotdRole = role.id;
                            await update(guildData);
                            await selectionCollector.emit('end');
                            return;
                        }
                        break;
                    case 'enabledisable':
                        const channel = await getChannelFromString(collectedMessage, messageResponse.guild!);
                        if (channel == null) {
                            await messageResponse.reply({content: "I can't find that channel. Try again."});
                        } else {
                            await messageResponse.reply({content: `${confirmationMessage()} Question of the Day has been enabled and the QOTD channel has been set to <#${channel.id}>.`});
                            guildData.channels.qotdChannelId = channel.id;
                            await update(guildData);
                            await selectionCollector.emit('end');
                            return;
                        }
                        break;
                }
            }
        });
    } catch (e) {
        console.debug(`Error: ${e}`);
    }
}

const buildButtons = async (
    qotdEnabled: boolean,
    whitelistEnabled: boolean
): Promise<ActionRowBuilder<MessageActionRowComponentBuilder>> => {

    const buttonRow: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();
    const enableDisableQotdButton = new ButtonBuilder()
        .setLabel(qotdEnabled ? "Disable QOTD" : "Enable QOTD")
        .setStyle(qotdEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
        .setEmoji(qotdEnabled ? {name: "✖️"} : {name: "✔️"})
        .setCustomId('enabledisable');
        buttonRow.addComponents(enableDisableQotdButton);


    const whitelistButton = new ButtonBuilder()
        .setLabel(whitelistEnabled ? "Disable Whitelist" : "Enable Whitelist")
        .setStyle(whitelistEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
        .setEmoji(whitelistEnabled ? {name: "✖️"} : {name: "✔️"})
        .setCustomId('whitelist');
        buttonRow.addComponents(whitelistButton);

    const rolePingButton = new ButtonBuilder()
        .setLabel("Role Ping")
        .setStyle(ButtonStyle.Primary)
        .setCustomId('roleping');
        buttonRow.addComponents(rolePingButton);

    const doneButton = new ButtonBuilder()
        .setCustomId('done')
        .setLabel('Done')
        .setStyle(ButtonStyle.Secondary)
    ;
    buttonRow.addComponents(doneButton);
    return buttonRow
}


export const sendQotdSettingsEmbedAndCollectResponses = async (
    interaction: Message<boolean>,
    guildData: GuildDataInterface,
    authorId: string,
    selectRow: ActionRowBuilder<MessageActionRowComponentBuilder>
) => {
    const qotdEnabled = guildData.channels.qotdChannelId != undefined && guildData.channels.qotdChannelId != "";
    const whitelistEnabled = guildData.qotd.qotdWhitelist ? guildData.qotd.qotdWhitelist : false;
    
    let embed = await createQotdSettingsEmbed(interaction, guildData, qotdEnabled);
    let response: Message<boolean> = await interaction.edit({
        content: "", 
        embeds: [embed], 
        components: [selectRow, await buildButtons( qotdEnabled, whitelistEnabled)]
    });
    let replyMessage;
    try {
        const buttonCollectorFilter = (i: { user: { id: string; }; }) => i.user.id === authorId;
        const buttonCollector = response.createMessageComponentCollector({ componentType: ComponentType.Button, filter: buttonCollectorFilter, time: 60000});
        let collected: boolean = false;
        buttonCollector.on('collect', async buttonResponse => {
            try { await buttonResponse.deferReply() } catch (e) {}
            if (buttonResponse.user.id == authorId && !collected) {
                collected = true;
                switch (buttonResponse.customId) {
                    case 'done':
                        sleep(200).then( async () => {try {await response.delete();} catch (e) {}});
                    case 'whitelist':
                        guildData.qotd.qotdWhitelist = whitelistEnabled ? false : true;
                        await update(guildData);
                        replyMessage = `${confirmationMessage()} the QOTD whitelist is now ${whitelistEnabled ? "disabled" : "enabled"}.`;
                        if (whitelistEnabled) replyMessage += `\nUse \`/qotd whitelist\` to add/remove roles from the whitelist.`;
                        await buttonResponse.followUp({content: replyMessage, ephemeral: true});
                    default:
                        sleep(200).then( async () => await sendReplyAndCollectResponses(buttonResponse, guildData, buttonResponse.customId, authorId, whitelistEnabled, qotdEnabled) );
                }
                await buttonCollector.emit('refresh');
                collected = false;
            }
        });

        buttonCollector.on('refresh', async () => {
            sleep(200);
            embed = await createQotdSettingsEmbed(interaction, guildData, guildData.channels.qotdChannelId != undefined && guildData.channels.qotdChannelId != "");
            await interaction.edit({
                content: "", 
                embeds: [embed], 
                components: [selectRow, await buildButtons( guildData.channels.qotdChannelId != undefined && guildData.channels.qotdChannelId != "", guildData.qotd.qotdWhitelist)]
            });
        });

        const messageId = interaction.id;
        const channel = interaction.channel;
        buttonCollector.on('end', async () => { 
            try {
                interaction = await channel.messages.fetch(messageId);
                try {await interaction.delete()} catch (e) {
                    await interaction.edit({content: "", embeds: [embed], components: []}); 
                }
            } catch (e) {}
        });

    } catch (e) {
        console.debug(`Error: ${e}`);
    }
}


export const qotd: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('qotd')
        .setDescription('Question of the Day')
        .addSubcommand((subcommand) => 
            subcommand
                .setName('new')
                .setDescription('Send a question of the day in a designated channel!')
        )
        .addSubcommand((subcommand) => 
            subcommand
                .setName('whitelist')
                .setDescription('Manage the QOTD whitelist')
                .addStringOption((option) =>
                    option
                        .setName('addremove')
                        .setChoices(
                            {name: "Add Role", value: "add"},
                            {name: "Remove Role", value: "remove"}
                        )
                        .setDescription('Whether to add or remove a role')
                        .setRequired(true)
                )
                .addRoleOption((option) =>
                    option
                        .setName('role')
                        .setDescription('Role allowed to post QOTDs')
                        .setRequired(true)
                )
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
                await createNewQotd(interaction)
                break;
            case 'whitelist':
                await interaction.deferReply({ephemeral: true});
                const addRemove = interaction.options.getString('addremove');
                await addRemoveRole(interaction, addRemove == 'add' ? true : false);
                break;
        }
        return;
    },
    properties: {
        Name: 'Question Of the Day',
        Scope: 'global',
        GuildOnly: true,
        DefaultEnabled: true,
        Enabled: true,
        Permissions: [],
        Ephemeral: false,
        Defer: false,
    }
}