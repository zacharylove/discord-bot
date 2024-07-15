import { EmbedBuilder, SlashCommandBuilder } from "@discordjs/builders";
import { CommandInterface } from "../../interfaces/Command.js";
import { ChatInputCommandInteraction, CommandInteraction, Message, PermissionsBitField } from "discord.js";
import { getGuildDataByGuildID, isCustomResponseEnabled } from "../../database/guildData.js";
import { confirmationMessage } from "../../utils/utils.js";
import { GuildDataInterface } from "../../database/models/guildModel.js";
import { hasPermissions } from "../../utils/userUtils.js";
// @ts-ignore
import { default as config } from "../../config/config.json" assert { type: "json" };

// Regex patterns
const variablePattern = /{([^}]*)}/g;
const customPattern = /\s*\d*\s*/g;

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

    if (config.response.allowRegex) {
        description += "Regular expressions (RegEx) is supported in trigger messages! Refer to this [RegEx cheatsheet](https://www.rexegg.com/regex-quickstart.html) to see a list of expressions you can use!\n";
        description += "In addition to RegEx, you can define up to 5 variables in the trigger message that can be referred to in the response:\n"
    } else {
        description += "You can define up to 5 variables in the trigger message that can be referred to in the response:\n"
    }
    description += '- The format of variables is `{number}`, so with trigger message of "I\'m {1}" and a response message of "Hi {1}, I\'m dad", the message "I\'m hungry" will produce the response "Hi hungry, I\'m dad".\n';

    description += "\n**Notes:**\n";
    if (config.response.allowRegex) {
        description += "- You cannot use any regular expressions in the response message except user-created variables like {1}.\n";
        description += "- There are some limitations placed on regular expressions to avoid DoS attacks. Don't take advantage of this feature please.\n";
    }
    description += `- You can define a maximum of ${config.response.maxGuildResponses} responses per server.\n`

    embed.setDescription(description);



    let examples = '/response add `"hardly"` `"{*}er"` `"I hardly know her!"` `Part of message\n`';
    examples += '/response add `"pogchamp"` `"{pog | pogchamp }"` `"Pogular champion"` `Part of message\n`';
    examples += '/response add `"nolinks"` `{*}{http:// | https://}{*}` `"No links allowed!"` `Full message`\n';
    examples += '/response add `"ping"` `"ping"` `"pong!"` `Full message`\n';
    examples += '/response add `"eating"` `"{I\'m eating | I ate | I am eating}{1}"` `"Yum! I hope {1} was delicious!"` `Full message`\n';

    embed.addFields({name: 'Examples', value: examples});

    await interaction.editReply({embeds: [embed]});
    return;
}

function validateRegex(pattern: string) {
    var parts = pattern.split('/'),
        regex = pattern,
        options = "";
    if (parts.length > 1) {
        regex = parts[1];
        options = parts[2];
    }
    try {
        new RegExp(regex, options);
        return true;
    }
    catch(e) {
        return false;
    }
}

const validateMessages = async (interaction: CommandInteraction, trigger: string, response: string): Promise<{valid: boolean, isRegex: boolean, regexTrigger: string}> => {
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
        await interaction.editReply(`There is a syntax error for the variable(s) in your trigger message. Try again!`);
        return {valid: false, isRegex: false, regexTrigger: ""};
    }

    // Response: validate whether brackets are correct
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
        await interaction.editReply(`There is a syntax error for the variable(s) in your response message. Try again!`);
        return {valid: false, isRegex: false, regexTrigger: ""};
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
        // If custom variable
        if (customPattern.exec(v) !== null) continue;
        // If none of these, invalid.
        valid = false;
        invalidVariable = v;
        break;
    }
    if (!valid) {
        await interaction.editReply(`Invalid variable {${invalidVariable}}. You can only use numbers for variables, such as {5}.`);
        return {valid: false, isRegex: false, regexTrigger: ""};
    }
    let isRegex: boolean = false;
    // Replace custom variables with regex (thanks aeiou)
    let regex = new RegExp('\\\\{(\\d+)\\\\}', 'g');
    let trigger_regex = trigger.replace(/[-\\^$*+?.()|[\]{}]/g, '\\$&');
    const trigger_copy = trigger_regex;
    match = regex.exec(trigger_copy);
    let seen: string[] = [];
    while (match) {
        if (seen.includes(match[0])) {
            trigger_regex = trigger_regex.replace(match[0], `\\${match[1]}`);
        }
        else {
            seen.push(match[0]);
            trigger_regex = trigger_regex.replace(match[0], `(.+)`);
            isRegex = true;
        }
        match = regex.exec(trigger_copy);
    }
    trigger = trigger_regex;

    // Validate regex (if exists)
    
    // Look for / at beginning and end of message
    if (trigger.charAt(0) == "/" && trigger.charAt(trigger.length - 1) == "/") {
        if (!validateRegex(trigger)) {
            await interaction.editReply(`Invalid regular expression! If you weren't trying to use RegEx, please remove the / character at the beginning or end of your message.`);
            return {valid: false, isRegex: false, regexTrigger: ""};
        }
        isRegex = true;
    }

    // If all checks pass, return true.
    return {valid: true, isRegex: isRegex, regexTrigger: trigger};
}

const createReaction = async (interaction: ChatInputCommandInteraction) => {
    let name = interaction.options.getString('name');
    let trigger = interaction.options.getString('trigger');
    let response = interaction.options.getString('response');
    let isReply = interaction.options.getBoolean('reply') ? interaction.options.getBoolean('reply') : true;
    let channelWhitelist = interaction.options.getChannel('channel');
    let allowping = interaction.options.getBoolean('allowping') ? interaction.options.getBoolean('allowping') : false;
    let fullmessage = interaction.options.getString('fullmessage') ? interaction.options.getString('fullmessage') : "full";
    if (!name || !trigger || !response || !interaction.guildId) {
        await interaction.editReply('Invalid response command! Make sure you define the name, trigger, and response.');
        return;
    }

    let guildData = await getGuildDataByGuildID(interaction.guildId);
    if (!await isCustomResponseEnabled(guildData)) {
        await interaction.editReply("Custom Responses are disabled for this server! Use `/settings feature enable CustomResponses` to enable.")
        return;
    }
    if (!guildData.customResponses) {
        console.debug(`No customResponses array exists for guild ${interaction.guildId}, creating...`);
        guildData.customResponses = new Array();
    }
    // If response already exists
    else if (guildData.customResponses.some(r => r.name == name)) {
        await interaction.editReply(`A response named ${name} already exists for this server!`);
        return;
    }
    else if (guildData.customResponses.length >= config.response.maxGuildResponses) {
        await interaction.editReply(`You've reached the maximum number of custom responses for this server (10). Please delete an existing response if you want to add a new one.`);
        return;
    }

    // Validate trigger and response messages
    const {valid, isRegex, regexTrigger} = await validateMessages(interaction, trigger, response);
    if (!valid) return;
    trigger = regexTrigger;



    // Save response to database
    const num = guildData.customResponses.push({
        name: name,
        enabled: true,
        trigger: trigger,
        response: response,
        regex: isRegex,
        reply: isReply ? isReply : true,
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
    if (!await isCustomResponseEnabled(guildData)) {
        await interaction.editReply("Custom Responses are disabled for this server! Use `/settings feature enable CustomResponses` to enable.")
        return;
    }
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
                .addBooleanOption((option) =>
                    option
                        .setName('reply')
                        .setDescription('Reply to trigger message')
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
        Name: 'Custom Response',
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

        // Check channel id
        if (pattern.channelId != null && message.channelId != pattern.channelId) return;
        
        let response = "";
        if (pattern.regex) {
            try {
                // Stolen from aeiou- prevent catastrophic backtracking
                if (pattern.trigger.includes('(.+) (.+)') || pattern.trigger.includes('(.+)(.+)')) continue;

                const re = new RegExp(pattern.trigger, "i");
                const match = message.content.match(re);
                if (match) {
                    response = pattern.response;
                    for (let i = 0; i < match.length; i++) {
                        response = response.replaceAll(`{${i + 1}}`, match[i + 1]);
                    }
                    if (pattern.reply) {
                        await message.reply(response);
                    } else {
                        await message.channel.send(response);
                    }
                }
            } catch (e) {
                console.error(`Response ${pattern.name} is defined as regex but regex string is invalid: ${e}`);
            }
        }

        if (pattern.trigger == message.content) {
                response = pattern.response;
                // Prevent pings
                if( !pattern.allowPing ) {
                    response = response.replaceAll("@", "");
                }
                if (pattern.reply) {
                    await message.reply(response);
                } else {
                    await message.channel.send(response);
                }
        }
    
    }
}