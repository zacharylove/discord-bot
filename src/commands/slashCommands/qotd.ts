import { CommandInteraction, EmbedBuilder, GuildMemberRoleManager, PermissionsBitField, SlashCommandBuilder, TextChannel, TextInputBuilder, TextInputStyle } from "discord.js";
import { CommandInterface } from "../../interfaces/Command.js";
import { CommandStatus, broadcastCommandStatus } from "../../utils/commandUtils.js";
import { hasPermissions } from "../../utils/userUtils.js";
import { getGuildDataByGuildID, update } from "../../database/guildData.js";
import { confirmationMessage } from "../../utils/utils.js";
import { addThread } from "../../database/internalData.js";
import { ActionRowBuilder, ModalActionRowComponentBuilder, ModalBuilder } from "@discordjs/builders";

const disableQotd = async (interaction: CommandInteraction) => {
    if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.guild || !interaction.channel) {
        await broadcastCommandStatus(interaction, CommandStatus.CriticallyFailed, {command: qotd, reason: "Invalid interaction!"});
        return;
    }
    const guildData = await getGuildDataByGuildID(interaction.guildId);
    guildData.qotd.qotdRole = "";
    guildData.qotd.qotdWhitelist = false;
    guildData.qotd.whitelistedRoleIds = [];
    guildData.channels.qotdChannelId = "";
    await update(guildData);
    await interaction.editReply(`${confirmationMessage()} disabled QOTD for this server.`);
    return;
}

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

const setupQOTD = async (interaction: CommandInteraction) => {
    if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.guild || !interaction.channel || !interaction.member) {
        await broadcastCommandStatus(interaction, CommandStatus.CriticallyFailed, {command: qotd, reason: "Invalid interaction!"});
        return;
    }
    // Must be a mod
    if ( !hasPermissions(PermissionsBitField.Flags.ManageGuild, interaction.guild, interaction.user) ) {
        await interaction.editReply('You must be a mod to use this command!');
        return;
    }

    const channel = interaction.options.getChannel('channel');
    if (channel == null) {
        await interaction.editReply('You must provide a channel!');
        return;
    }
    let isWhitelist = interaction.options.getBoolean('whitelist');
    if (isWhitelist == null) isWhitelist = false;
    const qotdRole = interaction.options.getRole('qotdrole');

    const guildData = await getGuildDataByGuildID(interaction.guildId);

    guildData.channels.qotdChannelId = channel.id;
    guildData.qotd.qotdWhitelist = isWhitelist;
    if (qotdRole) guildData.qotd.qotdRole = qotdRole.id;

    await interaction.editReply(`${confirmationMessage()} the QOTD channel is now ${channel.name} ${qotdRole? `, the role ${qotdRole.name} gets pinged, ` : `` }and ${isWhitelist ? `only specific roles can post new QOTDs. Use \`\/qotd addrole\` to add a whitelisted role!` : `anyone can post new QOTDs!`}`);
    await update(guildData);
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
                .setName('setup')
                .setDescription('Set up a qotd channel and roles')
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('The channel where new QOTDs are posted')
                        .setRequired(true)    
                )    
                .addRoleOption((option) => 
                    option
                        .setName("qotdrole")
                        .setDescription("(pingable) role to ping when a new qotd is posted")
                        .setRequired(false)    
                    )
                .addBooleanOption((option) =>
                    option
                        .setName('whitelist')
                        .setDescription('Whether to only allow specific roles to post')
                        .setRequired(false)    
                )
        )
        .addSubcommand((subcommand) => 
            subcommand
                .setName('addrole')
                .setDescription('Add a role to the QOTD whitelist')
                .addRoleOption((option) =>
                    option
                        .setName('role')
                        .setDescription('Role allowed to post QOTDs')
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) => 
            subcommand
                .setName('removerole')
                .setDescription('Remove a role from the QOTD whitelist')
                .addRoleOption((option) =>
                    option
                        .setName('role')
                        .setDescription('Role to deny posting QOTDs')
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) => 
            subcommand
                .setName('disable')
                .setDescription('Disables QOTD')
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
            case 'setup':
                await interaction.deferReply({ephemeral: true});
                await setupQOTD(interaction);
                break;
            case 'addrole':
                await interaction.deferReply({ephemeral: true});
                await addRemoveRole(interaction, true);
                break;
            case 'removerole':
                await interaction.deferReply({ephemeral: true});
                await addRemoveRole(interaction, false);
                break;
            case 'disable':
                await interaction.deferReply({ephemeral: true});
                await disableQotd(interaction);
                break;
        }
        return;
    },
    properties: {
        Name: 'QOTD',
        Scope: 'global',
        GuildOnly: true,
        DefaultEnabled: true,
        Enabled: true,
        Permissions: [],
        Ephemeral: false,
        Defer: false,
    }
}