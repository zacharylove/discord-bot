import { EmbedBuilder, SlashCommandBuilder } from "@discordjs/builders";
import { CommandInterface } from "../../interfaces/Command.js";
import { ChatInputCommandInteraction, CommandInteraction, Message, PermissionsBitField } from "discord.js";
import { getGuildDataByGuildID } from "../../database/guildData.js";
import { confirmationMessage } from "../../utils/utils.js";
import { GuildDataInterface } from "../../database/models/guildModel.js";
import { hasPermissions } from "../../utils/userUtils.js";

// Regex patterns
const variablePattern = /{([^}]*)}/g;
const orPattern = /.*\|.*/g;
const customPattern = /\s*\d*\s*/g;
const wildcardPattern = /\s*\*\s*/g;

const createHelpMessage = async (interaction: CommandInteraction) => {
    const embed = new EmbedBuilder()
        .setTitle('Help: Custom Responses')
    ;
    let description = "This command lets you create a custom message that gets sent by the bot whenever it sees a particular message or pattern.\n";
    description += "You can create a new response with `/response add`, delete an existing response with `/response delete`, or see a list of responses for this server with `/response list`.\n";
    
    description += "When creating a new response, you need to define the following:\n";
    description += "- **Name**: The name of the response, used to view, edit, or delete it later.\n";
    description += "- **Trigger**: The message the bot looks for, then responds to. You can use all sorts of variables"
    description += "- **Response**: The message the bot sends in response.\n"
    description += "- **Trigger Type (optional)**: Whether to look at the full message or part of a message for the trigger (default: full message).\n";
    description += "- **Channel (optional)**: Whether to only look for messages in a specific channel (default: no).\n"; 
    description += "- **Allow Pings (optional)**: Whether the bot can ping members in the response (default: no).\n";

    description += "\n**Notes:**\n";
    description += "- You cannot use any variables in the response message except user-created ones like {1}.\n";
    description += "- You cannot use variables inside of variables (for now)\n";

    embed.setDescription(description);


    let variables = "**NOTE:** Variables are currently not implemented.\n"
    variables += '- `{*}` = Any number of any characters\n';
    variables += '- `{word | message}` = Any specific words, in this case, "word" or "message\n"';
    variables += '- `{1}` = A custom variable, which you can refer to in the response. You can use any number in this variable.'


    let examples = '/response add `"hardly"` `"{*}er"` `"I hardly know her!"` `Part of message\n`';
    examples += '/response add `"pogchamp"` `"{pog | pogchamp }"` `"Pogular champion"` `Part of message\n`';
    examples += '/response add `"nolinks"` `{*}{http:// | https://}{*}` `"No links allowed!"` `Full message`\n';
    examples += '/response add `"ping"` `"ping"` `"pong!"` `Full message`\n';
    examples += '/response add `"eating"` `"{I\'m eating | I ate | I am eating}{1}"` `"Yum! I hope {1} was delicious!"` `Full message`\n';

    embed.addFields({name: 'Variables', value: variables});
    embed.addFields({name: 'Examples', value: examples});

    await interaction.editReply({embeds: [embed]});
    return;
}

const validateMessages = async (interaction: CommandInteraction, trigger: string, response: string): Promise<boolean> => {
    // Trigger: Validate whether brackets are correct (no nesting/orphaned brackets)
    let openingBracketFound = false;
    let valid = true;
    for( let i = 0; i < trigger.length; i++) {
        // If opening bracket found
        if (trigger[i] == '{') {
            if (openingBracketFound) {
                valid = false;
                break;
            }
            openingBracketFound = true;
        }
        if (trigger[i] == '}') {
            if (!openingBracketFound) {
                valid = false;
                break;
            }
            openingBracketFound = false;
        }
    }
    if (!valid) {
        await interaction.editReply(`There is a syntax error in your trigger message. Try again!`);
        return false;
    }

    // Response: validate whether brackets are correct
    // Trigger: Validate whether brackets are correct (no nesting/orphaned brackets)
    openingBracketFound = false;
    valid = true;
    if (response.includes('}') || response.includes('{')) {
        for( let i = 0; i < response.length; i++) {
            // If opening bracket found
            if (response[i] == '{') {
                if (openingBracketFound) {
                    valid = false;
                    break;
                }
                openingBracketFound = true;
            }
            if (response[i] == '}') {
                if (!openingBracketFound) {
                    valid = false;
                    break;
                }
                openingBracketFound = false;
            }
        }
    }
    if (!valid) {
        await interaction.editReply(`There is a syntax error in your response message. Try again!`);
        return false;
    }

    // Parse variables from trigger message
    const variables = [];
    let match;
    while ((match = variablePattern.exec(trigger)) !== null) {
        variables.push(match[1]);
    };

    // Check variables
    valid = true;
    let invalidVariable = "";
    for (var v of variables) {
        // If or variable
        if (orPattern.exec(v) !== null) continue;
        // If custom variable
        if (customPattern.exec(v) !== null) continue;
        // If wildcard variable
        if (wildcardPattern.exec(v) !== null) continue;
        // If none of these, invalid.
        valid = false;
        invalidVariable = v;
        break;
    }
    if (!valid) {
        await interaction.editReply(`Invalid variable {${invalidVariable}}. Use /response help to see a list of variables you can use.`);
        return false;
    }

    // If all checks pass, return true.
    return true;
}

const createReaction = async (interaction: ChatInputCommandInteraction) => {
    let name = interaction.options.getString('name');
    let trigger = interaction.options.getString('trigger');
    let response = interaction.options.getString('response');
    let channelWhitelist = interaction.options.getChannel('channel');
    let allowping = interaction.options.getBoolean('allowping') ? interaction.options.getBoolean('allowping') : false;
    let fullmessage = interaction.options.getString('fullmessage') ? interaction.options.getString('fullmessage') : "full";
    if (!name || !trigger || !response || !interaction.guildId) {
        await interaction.editReply('Invalid response command! Make sure you define the name, trigger, and response.');
        return;
    }

    let guildData = await getGuildDataByGuildID(interaction.guildId);
    if (!guildData.customResponses) {
        console.debug(`No customResponses array exists for guild ${interaction.guildId}, creating...`);
        guildData.customResponses = new Array();
    }
    // If response already exists
    else if (guildData.customResponses.some(r => r.name == name)) {
        await interaction.editReply(`A response named ${name} already exists for this server!`);
        return;
    }

    // Validate trigger and response messages
    if (!await validateMessages(interaction, trigger, response)) return;

    // Save response to database
    const num = guildData.customResponses.push({
        name: name,
        enabled: true,
        trigger: trigger,
        response: response,
        channelId: channelWhitelist ? channelWhitelist.id : null,
        allowPing: allowping ? allowping : false,
        fullMessage: fullmessage ? fullmessage == 'full' ? true : false : true
    });

    await guildData.save();
    
    await interaction.editReply(`${confirmationMessage()} I've added the custom response ${name}.\nThere are currently ${num} responses for this server.`);
    return;
}

const deleteReaction = async (interaction: ChatInputCommandInteraction) => {
    let name = interaction.options.getString('name');
    if (!name) {
        await interaction.editReply('Invalid response name!');
        return;
    }
    if (!interaction.guildId) {
        await interaction.editReply(`Something went wrong! I couldn't find this server's guild ID...`);
        return;
    }
    let guildData = await getGuildDataByGuildID(interaction.guildId);
    if (!guildData.customResponses) {
        console.debug(`No customResponses array exists for guild ${interaction.guildId}, creating...`);
        guildData.customResponses = new Array();
    }
    // If response already exists
    else if (!guildData.customResponses.some(r => r.name == name)) {
        await interaction.editReply(`No response named ${name} exists for this server!`);
        return;
    }
    let prevLength = guildData.customResponses.length;
    guildData.customResponses = guildData.customResponses.filter(r => r.name !== name);
    let newLength = guildData.customResponses.length;

    if (newLength != prevLength - 1) {
        await interaction.editReply(`Something weird happened... I removed ${prevLength - newLength} reaction(s) from the database.`);
    }
    else await interaction.editReply(`${confirmationMessage()} Removed ${prevLength - newLength} reaction from the database.`)
    await guildData.save();

    return;
}

const listReactions = async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.guildId) {
        await interaction.editReply(`Something went wrong! I couldn't find this server's guild ID...`);
        return;
    }
    let guildData = await getGuildDataByGuildID(interaction.guildId);
    if (!guildData.customResponses || guildData.customResponses.length == 0) {
        await interaction.editReply('No responses have been defined for this server. Use `/response new` to create one!');
    } else {
        let responseList = "## Custom Responses\n";
        for (let r of guildData.customResponses) {
            responseList += `- ${r.name}${r.allowPing ? ` (pings)` : ``}${r.channelId != null ? ` ( <#${r.channelId}>)` : ``}`;
            responseList += `\t\n\`${r.trigger}\`${r.fullMessage ? ` (full)` : `( partial)`} -> \`${r.response}\`\n`
        }
        await interaction.editReply(responseList);
    }
}

export const response: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('response')
        .setDescription('Custom responses')
        // ======== HELP MESSAGE ========
        .addSubcommand((subcommand) =>
            subcommand
                .setName('help')
                .setDescription('How to use this command')
        )
        // ======== NEW RESPONSE ========
        .addSubcommand((subcommand) =>
            subcommand
                .setName('new')
                .setDescription('Create a custom response')
                .addStringOption((option) =>
                    option
                        .setName('name')
                        .setDescription('Name of response')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('trigger')
                        .setDescription('Message pattern to look for')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('response')
                        .setDescription('Message to respond with')
                        .setRequired(true)
                )
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('Channel to respond in')
                        .setRequired(false)
                )
                .addBooleanOption((option) =>
                    option
                        .setName('allowping')
                        .setDescription('Allow bot to ping members/roles')
                        .setRequired(false)
                )
                .addStringOption((option) => 
                    option
                        .setName('fullmessage')
                        .setDescription("Look at entire message or part of message")
                        .addChoices(
                            { name: 'Entire message', value: 'full' },
                            { name: 'Part of message', value: 'partial'}
                        )
                        .setRequired(false)
                )
        )
        // ======== DELETE RESPONSE ========
        .addSubcommand((subcommand) =>
            subcommand
                .setName('delete')
                .setDescription('Delete a custom response')
                .addStringOption((option) =>
                    option
                        .setName('name')
                        .setDescription('Name of response to delete')
                        .setRequired(true)
                )
        )
        // ======== LIST RESPONSES ========
        .addSubcommand((subcommand) =>
            subcommand
                .setName('list')
                .setDescription('Lists custom responses')
        )

        ,
    run: async (interaction) => {
        // Disable context menu
        if (!interaction.isChatInputCommand()) {
            await interaction.editReply('This command cannot be used in a context menu');
            return;
        }
        // Disable DMS
        if (!interaction.guildId || !interaction.guild) {
            await interaction.editReply('This command cannot be used in DMs');
            return;
        }


        switch (interaction.options.getSubcommand()) {
            case 'help':
                return await createHelpMessage(interaction);
                
            case 'new':
                if(!hasPermissions(PermissionsBitField.Flags.ManageGuild, interaction.guild, interaction.user)) {
                    await interaction.editReply("You must have the `MANAGE SERVER` permission to create responses.");
                    return;
                }
                return await createReaction(interaction);

            case 'delete':
                if(!hasPermissions(PermissionsBitField.Flags.ManageGuild, interaction.guild, interaction.user)) {
                    await interaction.editReply("You must have the `MANAGE SERVER` permission to delete responses.");
                    return;
                }
                return await deleteReaction(interaction);

            case 'list':
                return await listReactions(interaction);

            default:
                await interaction.editReply("uh oh stinky");
        }

    },
    properties: {
        Name: 'Response',
        Aliases: [],
        Scope: 'global',
        GuildOnly: true,
        Enabled: true,
        DefaultEnabled: true,
        Intents: [],
        CanBeDisabled: false
    }

}


export const parseMessageForResponse = async (message: Message, guildData: GuildDataInterface) => {
    // If no responses set up
    if (!guildData.customResponses || guildData.customResponses.length == 0) return;
    // Check all responses
    for (const pattern of guildData.customResponses) {
       // TODO: VARIABLE SUPPORT!!

       // Check channel id
       if (pattern.channelId != null && message.channelId != pattern.channelId) return;
       
       if (pattern.trigger == message.content) {
            // Prevent pings
            if( !pattern.allowPing ) {
                pattern.response = pattern.response.replaceAll("@", "");
            }
            await message.reply(pattern.response);
       }
    
    }
}