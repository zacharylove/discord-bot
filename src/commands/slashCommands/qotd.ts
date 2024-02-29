import { CommandInteraction, EmbedBuilder, GuildMemberRoleManager, PermissionsBitField, SlashCommandBuilder, TextChannel } from "discord.js";
import { CommandInterface } from "../../interfaces/Command.js";
import { CommandStatus, broadcastCommandStatus } from "../../utils/commandUtils.js";
import { hasPermissions } from "../../utils/userUtils.js";
import { getGuildDataByGuildID, update } from "../../database/guildData.js";
import { confirmationMessage } from "../../utils/utils.js";
import { addThread } from "../../database/internalData.js";

const createNewQotd = async (interaction: CommandInteraction) => {
    if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.guild || !interaction.channel) {
        await broadcastCommandStatus(interaction, CommandStatus.CriticallyFailed, {command: qotd, reason: "Invalid interaction!"});
        return;
    }
    if ( interaction.options.getString('question') == null ) {
        await interaction.editReply('You must provide a QOTD message!');
        return;
    }
    const guildData = await getGuildDataByGuildID(interaction.guildId);
    if (guildData.channels.qotdChannelId == null || guildData.channels.qotdChannelId == "" ) {
        await interaction.editReply('No QOTD channel has been configured for this server! Have a mod run `/qotd setup` to set a channel.');
        return;
    }
    if (guildData.qotd.qotdWhitelist == null) {
        await interaction.editReply("QOTD has been improperly set up- this shouldn't happen! Try running `/qotd setup` again and if this happens again contact inco.");
        return;
    } else if (guildData.qotd.qotdWhitelist == true) {
        if (guildData.qotd.whitelistedRoleIds.length == 0) {
            await interaction.editReply('The QOTD whitelist is enabled, but no roles are whitelisted! Have a mod run `qotd addrole` to add some authorized roles.');
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
                await interaction.editReply('You are not authorized to post new QOTDs. Ask a mod to add your role to the whitelist.');
                return;
            }
            
            
        }
    }
    // Create the qotd message
    const question = interaction.options.getString('question');
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
    const imageString = interaction.options.getString('image');
    if (imageString) embed.setImage(imageString);

    // Set author
    embed.setAuthor({
        name: `${interaction.user.displayName != interaction.user.username ? `${interaction.user.displayName} (${interaction.user.username})` : interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL()
    })

    // Set color to random
    embed.setColor(Math.floor(Math.random()*16777215));

    await interaction.editReply(`QOTD received!`);
    const qotdMessage = await interaction.channel.send({embeds: [embed]});
    

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
    guildData.counters.numQotdPosts++;
    await update(guildData);
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

    const guildData = await getGuildDataByGuildID(interaction.guildId);

    guildData.channels.qotdChannelId = channel.id;
    guildData.qotd.qotdWhitelist = isWhitelist;

    await interaction.editReply(`${confirmationMessage()} the QOTD channel is now ${channel.name} and ${isWhitelist ? `only specific roles can post new QOTDs. Use \`\/qotd addrole\` to add a whitelisted role!` : `anyone can post new QOTDs!`}`);
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
                .addStringOption((option) =>
                    option
                        .setName('question')
                        .setDescription('What is your question?')
                        .setRequired(true)    
                )
                .addStringOption((option) =>
                    option
                        .setName('image')
                        .setDescription('An image to attach to your QOTD (URLs only)')
                        .setRequired(false)
                )
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
                await setupQOTD(interaction);
                break;
            case 'addrole':
                await addRemoveRole(interaction, true);
                break;
            case 'removerole':
                await addRemoveRole(interaction, false);
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
        Ephemeral: true,
    }
}