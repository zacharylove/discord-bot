import { ButtonBuilder, EmbedBuilder, MessageActionRowComponentBuilder, ModalActionRowComponentBuilder, SlashCommandBuilder } from "@discordjs/builders";
import { CommandInterface } from "../../interfaces/Command.js";
import { ActionRowBuilder, ButtonInteraction, ButtonStyle, CacheType, ChatInputCommandInteraction, CommandInteraction, ComponentType, InteractionCollector, Message, ModalBuilder, PermissionsBitField, TextInputBuilder, TextInputStyle } from "discord.js";
import { getGuildDataByGuildID, isCustomResponseEnabled } from "../../database/guildData.js";
import { confirmationMessage, emojiToString, getEmoji, getEmojiFromString, sleep } from "../../utils/utils.js";
import { GuildDataInterface } from "../../database/models/guildModel.js";
import { hasPermissions } from "../../utils/userUtils.js";
// @ts-ignore
import { default as config } from "../../config/config.json" assert { type: "json" };
import { BOT } from "../../index.js";
import { update } from "../../database/guildData.js";
import { MessageEmoji } from "../../interfaces/MessageContent.js";

export const createResponseSettingsEmbed = async (interaction: Message<boolean>, guildData: GuildDataInterface, responsesEnabled: boolean): Promise<EmbedBuilder> => {   
    const embed = new EmbedBuilder()
        .setTitle(`⤴️ Custom Response Settings for ${interaction.guild?.name}`)
        .setAuthor({name: "Settings > Custom Responses"})
        .setFooter({text: `Custom Response Status: ${responsesEnabled ? "ENABLED" : "DISABLED"}`});
        ;

    let description = "Welcome to the custom response settings menu.\n";
    description += "Custom responses are messages or reactions that are automatically sent whenever the bot detects a trigger in a message sent to a text channel.\n";
    description += "A trigger can be a word, phrase, or entire message. It's up to you!\n";
    description += "\nHere, you can create or delete custom responses for this server.\n";

    description += "\n Press the buttons below to modify your settings.";
    embed.setDescription(description);

    let responseList = "";
    let count = 1;
    for (let r of guildData.customResponses) {
        responseList += `${count}. **${r.name}**${r.allowPing ? ` (pings)` : ``}${r.channelId != null ? ` ( <#${r.channelId}>)` : ``}`;
        responseList += `: "\`${r.trigger}\`"${r.fullMessage ? ` (full)` : ` (partial)`} => ${r.response ? `"\`${r.response}\`"` : ""}${r.reaction != null ? ` + ${emojiToString(r.reaction)} reaction` : ''}\n`
        count++;
    }
    embed.addFields({name: "Responses", value: responseList});

    return embed;
}

const buildSettingsButtons = async (
    responsesEnabled: boolean,
    disableButtons: boolean
): Promise<ActionRowBuilder<MessageActionRowComponentBuilder>[]> => {
    const firstButtonRow: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();
    const secondButtonRow: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();

    const addResponseButton = new ButtonBuilder()
        .setLabel("Add Response")
        .setStyle(ButtonStyle.Primary)
        .setEmoji({name: "➕"})
        .setCustomId('addresponse');
    if (disableButtons) addResponseButton.setDisabled(true);
    firstButtonRow.addComponents(addResponseButton);

    const deleteResponseButton = new ButtonBuilder()
        .setLabel("Delete Response")
        .setStyle(ButtonStyle.Danger)
        .setEmoji({name: "➖"})
        .setCustomId('deleteresponse');
    if (disableButtons) deleteResponseButton.setDisabled(true);
    firstButtonRow.addComponents(deleteResponseButton);

    const toggleResponsesButton = new ButtonBuilder()
        .setLabel(`${responsesEnabled ? "Disable" : "Enable"} Responses`)
        .setStyle(responsesEnabled ? ButtonStyle.Danger : ButtonStyle.Success)
        .setEmoji(responsesEnabled ? {name: "✖️"} : {name: "✔️"})
        .setCustomId('toggleresponses');
    if (disableButtons) toggleResponsesButton.setDisabled(true);
    secondButtonRow.addComponents(toggleResponsesButton);

    const doneButton = new ButtonBuilder()
        .setCustomId('done')
        .setLabel('Done')
        .setStyle(ButtonStyle.Secondary)
    ;
    if (disableButtons) doneButton.setDisabled(true);
    secondButtonRow.addComponents(doneButton);

    if (!responsesEnabled) return [secondButtonRow]
    return [firstButtonRow, secondButtonRow]
}

const updateSettingButtonsAndSendMessage = async (
    interaction: Message<boolean>,
    guildData: GuildDataInterface,
    responsesEnabled: boolean,
    selectRow: ActionRowBuilder<MessageActionRowComponentBuilder>,
    disableButtons: boolean = false
): Promise<Message<boolean>> => {
    const embed = await createResponseSettingsEmbed(interaction, guildData, responsesEnabled);

    let buttonRows = await buildSettingsButtons(responsesEnabled, disableButtons);
    if (disableButtons) selectRow.components.forEach(c => c.setDisabled(true));
    let components = [selectRow];
    for (const row of buttonRows) components.push(row);
    let response: Message<boolean> = await interaction.edit({content: "", embeds: [embed], components: components})
    
    return response;
}

const buildAddButtons = async (
    partial: boolean,
    reaction: MessageEmoji | null
): Promise<ActionRowBuilder<MessageActionRowComponentBuilder>[]> => {
    const firstButtonRow: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();
    const secondButtonRow: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();

    const setReactionButton = new ButtonBuilder()
        .setLabel(`Set Reaction`)
        .setCustomId('setreaction');

    if (reaction != null) {
        setReactionButton.setEmoji({name: reaction.name});
    }
    setReactionButton.setStyle(ButtonStyle.Primary);
    firstButtonRow.addComponents(setReactionButton);

    const responseTypeButton = new ButtonBuilder()
        .setLabel(`Type: ${partial ? "Partial" : "Full"}`)
        .setStyle(ButtonStyle.Primary)
        .setEmoji({name: partial ? "◽" : "◻"})
        .setCustomId('responsetype');
    firstButtonRow.addComponents(responseTypeButton);

    const createResponseButton = new ButtonBuilder()
        .setLabel("Create")
        .setStyle(ButtonStyle.Success)
        .setEmoji({name: "➕"})
        .setCustomId('createresponse');
    secondButtonRow.addComponents(createResponseButton)

    const backButton = new ButtonBuilder()
        .setCustomId('back')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    ;
    secondButtonRow.addComponents(backButton);

    return [firstButtonRow, secondButtonRow]
}

const createAddResponseEmbed = async (interaction: Message<boolean>): Promise<EmbedBuilder> => {   
    const embed = new EmbedBuilder()
        .setTitle(`⤴️ Add Custom Response for ${interaction.guild?.name}`)
        .setAuthor({name: "Settings > Custom Responses > Add Response"})
        ;

    let description = "Let's add a new custom response!\n";

    description += `When you press the "Create" button, a modal will pop up where you can enter the following:\n`;
    description += "**Name**\nThis is the name for your new custom response. You'll use this name to look up or delete the response.\n";
    description += "**Trigger**\nThis is the word/phrase/message that the bot will look for. Once it sees a message with this trigger, it will reply with a response message (if set) and/or react to the message with a response emoji.\n";
    description += "**Response**\nIf set, this is the message that will be sent as a reply to the trigger message.\n";


    description += "\nYou can use the buttons below to set some optional parameters for your response:\n";
    description += "**Reaction**\nSets the emoji that will be used to react to the trigger message.\n";
    description += "**Type**\n Defines whether you want your trigger to be a full message or a partial message:\n";
    description += "- `Full` Message means that the bot will only respond to a message that matches the trigger *exactly*.\n";
    description += `  - E.g, if your trigger is "hello", the bot will respond to the message "hello" but not "hello guys".\n`;
    description += "- `Partial` Message means that the bot will respond to any message that *contains* your trigger.\n";
    description += `  - E.g, if your trigger is "hi", the bot will respond to "hi", "hi guys", and "hilarious".\n`

    description +="\n**NOTES:**\n";
    description += `- Once you press "Create" and fill out the form, the reaction will be created immediately. Make sure to set your optional parameters first!\n`;
    description += `- Both response and reaction are optional, but you MUST define at least one of them. You can set one or the other or even both, but you cannot have both be blank.\n`
    description += `- Whitespace matters! If your trigger is "hi ", the bot will respond to "hi guys" but not "oh hi".`

    embed.setDescription(description);
    return embed;
}

const updateAddButtonsAndSendMessage = async (
    interaction: Message<boolean>,
    partial: boolean,
    reaction: MessageEmoji | null
) => {
    const embed = await createAddResponseEmbed(interaction);
    let buttonRows =  await buildAddButtons(partial, reaction);
    const components = [];
    for (const row of buttonRows) components.push(row);
    let response: Message<boolean> = await interaction.edit({content: "", embeds: [embed], components: components})
    return response;
}

const buildAddModal = async (
    isEmojiSet: boolean
): Promise<ModalBuilder> => {
    const modal = new ModalBuilder()
        .setCustomId('addResponseModal')
        .setTitle("Add Custom Response");

    const responseName = new TextInputBuilder()
        .setCustomId('name')
        .setLabel("Enter custom response name")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(16)
        .setPlaceholder('Alphanumeric text only, 16 character limit.');
    const nameTextRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
        .addComponents(responseName);

    const triggerMessage = new TextInputBuilder()
        .setCustomId('trigger')
        .setLabel("Enter trigger word/phrase/message")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50)
        .setPlaceholder('50 character limit.');
    const triggerTextRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
        .addComponents(triggerMessage);


    const responseMessage = new TextInputBuilder()
        .setCustomId('response')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(50)
        .setPlaceholder('50 character limit.');

    if (isEmojiSet) {
        responseMessage.setLabel("(OPTIONAL) Enter response message")
    } else {
        responseMessage.setLabel("Enter response message")
    }
    const responseTextRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
        .addComponents(responseMessage);

    modal.addComponents(nameTextRow, triggerTextRow, responseTextRow);
    return modal;
}

export const sendAddResponseEmbedAndCollectResponses = async (
    interaction: Message<boolean>,
    guildData: GuildDataInterface,
    authorId: string,
    selectRow: ActionRowBuilder<MessageActionRowComponentBuilder>
) => {

    let response = await await updateAddButtonsAndSendMessage(interaction, false, null);

    let isPartial = false;
    let returnToSettingsMenu: boolean = false;
    let reactionEmoji: MessageEmoji | null = null;
    
    try {
        const addbuttonCollectorFilter = (i: { user: { id: string; }; }) => i.user.id === authorId;
        const addbuttonCollector: InteractionCollector<ButtonInteraction<CacheType>> = response.createMessageComponentCollector({ componentType: ComponentType.Button, filter: addbuttonCollectorFilter, time: 60000});
        let collected: boolean = false;
        
        const modal = await buildAddModal(reactionEmoji != null)
        addbuttonCollector.on('collect', async buttonResponse => {
            if (buttonResponse.user.id == authorId && !collected) {
                collected = true;
                switch (buttonResponse.customId) {
                    case 'back':

                        addbuttonCollector.emit('end');
                        await sendResponseSettingsEmbedAndCollectResponses(response, guildData,authorId,selectRow);
                        break;
                    
                    case 'responsetype':

                        isPartial = !isPartial;
                        sleep(200).then(async () => response = await updateAddButtonsAndSendMessage(response, isPartial, reactionEmoji));
                        break;

                    case 'createresponse':
                        await buttonResponse.showModal(modal);

                        await buttonResponse.awaitModalSubmit({
                            time: 60000,
                            filter: i => {
                                // All interactions must be deferred, even ones that do not match filter
                                i.deferUpdate();
                                return i.user.id === authorId
                            },
                        }).then(async submitted => {
                            let responseName = submitted.fields.getTextInputValue('name').toLowerCase();
                            let responseTrigger = submitted.fields.getTextInputValue('trigger');
                            let responseMessage = submitted.fields.getTextInputValue('response');
                            if (reactionEmoji == null && responseMessage == "") {
                                await submitted.followUp({content: "Something went wrong.", ephemeral: true});
                                throw new Error("Both reaction and response message are empty for custom response!");
                            }

                            // If response name already exists
                            if (guildData.customResponses.some(r => r.name == responseName)) {
                                await submitted.followUp({content: `A response named ${responseName} already exists for this server!`});
                                return;
                            }

                            // Build new response
                            const customResponse = {
                                name: responseName,
                                enabled: true,
                                trigger: responseTrigger,
                                response: responseMessage,
                                regex: false,
                                reply: true,
                                channelId: null,
                                allowPing: false,
                                fullMessage: !isPartial,
                                reaction: reactionEmoji
                            };

                            const num = guildData.customResponses.push(customResponse);
                            await guildData.save();
                            console.log(`Added new custom response to ${submitted.guild?.name}: ${responseName}`)
                            await submitted.followUp({content: `${confirmationMessage()} I've added the custom response ${responseName}.\nThere are currently ${num} responses for this server.`})
                        }).finally(async () =>
                            await sendResponseSettingsEmbedAndCollectResponses(response, guildData,authorId,selectRow)
                        );
                        break;

                    case 'setreaction':

                        const reactionTargetMessage = await buttonResponse.channel!.send({content: "Please react to this message with the emoji you would like to use."});
                        const reactionCollector = reactionTargetMessage.createReactionCollector({ 
                            filter: (reaction, user) => {
                                return user.id === authorId
                            }, 
                            time: 15_000 
                        });

                        reactionCollector.on('collect', async (reaction, user) => {
                            reactionEmoji = {
                                id: reaction.emoji.id,
                                animated: reaction.emoji.animated,
                                name: reaction.emoji.name
                            } as MessageEmoji;

                            reactionCollector.emit('end');
                            if (reactionEmoji != null) await reactionTargetMessage.edit({content: `Okay, the reaction emoji has been set to ${emojiToString(reactionEmoji)}.`})
                            else await reactionTargetMessage.edit({content: `something went wrong.`});
                            try {
                                response = await updateAddButtonsAndSendMessage(response, isPartial, reactionEmoji);
                            } catch (e) {}
                            sleep(10000).then(async () => await reactionTargetMessage.delete());
                        });
                        

                        

                        break;
                    
                }
                // Try to update message and buttons w/ new data
                
                sleep(200).then(() => collected = false);
            }
        });

    } catch (e) {
        console.debug(`Error: ${e}`);
    }
    

}

export const sendResponseSettingsEmbedAndCollectResponses = async (
    interaction: Message<boolean>,
    guildData: GuildDataInterface,
    authorId: string,
    selectRow: ActionRowBuilder<MessageActionRowComponentBuilder>
) => {
    let responsesEnabled = guildData.messageScanning.customResponse && guildData.messageScanning.customResponse == true;
    
    let response = await updateSettingButtonsAndSendMessage(interaction, guildData, responsesEnabled, selectRow);

    try {
        const buttonCollectorFilter = (i: { user: { id: string; }; }) => i.user.id === authorId;
        const buttonCollector = response.createMessageComponentCollector({ componentType: ComponentType.Button, filter: buttonCollectorFilter, time: 60000});
        let collected: boolean = false;
        let addingButtons = false;

        buttonCollector.on('collect', async buttonResponse => {
            
            if (buttonResponse.user.id == authorId && !collected) {
                switch (buttonResponse.customId) {
                    case 'done':
                        try { await buttonResponse.deferUpdate() } catch (e) {}
                        collected = true;
                        sleep(200).then( async () => {try {await response.delete();} catch (e) {}});
                        await buttonCollector.stop();
                        return;

                    case 'addresponse':
                        try { await buttonResponse.deferUpdate() } catch (e) {}
                        if (!responsesEnabled) {
                            await buttonResponse.followUp({content: `Custom responses are disabled!`, ephemeral: true});
                            break;
                        }
                        // If at max responses
                        else if (guildData.customResponses.length >= config.response.maxGuildResponses) {
                            await buttonResponse.followUp({content:`You've reached the maximum number of custom responses for this server (${config.response.maxGuildResponses}). Please delete an existing response if you want to add a new one.`, ephemeral: true});
                            break;
                        }
                        collected = true;
                        addingButtons = true;
                        buttonCollector.emit('end');
                        await sendAddResponseEmbedAndCollectResponses(interaction, guildData, authorId, selectRow);
                        break;
                    
                    case 'deleteresponse':
                        try { await buttonResponse.deferUpdate() } catch (e) {}
                        collected = true;
                        const deleteMessage = await buttonResponse.followUp({content:`Send a message with the number corresponding to the response you want to delete.`});
                        const messageCollectorFilter = (m: Message<boolean>) => m.author.id === authorId;
                        buttonResponse.channel!.awaitMessages({ filter: messageCollectorFilter, max: 1, time: 30000, errors: ['time'] }).then(async collectedResponse => {
                            const collectedMessage = collectedResponse.first();
                            if(collectedMessage == undefined) return;

                            if(Number.isNaN(Number(collectedMessage.content)) || Number(collectedMessage.content) <= 0 || Number(collectedMessage.content) > guildData.customResponses.length) {
                                await collectedMessage.reply({content: "Invalid number!"});
                            } else {
                                try { await collectedMessage.delete() } catch (e) {}
                                const selectedNumber: number = Number(collectedMessage.content);
                                const selectedResponse = guildData.customResponses[selectedNumber - 1];
                                guildData.customResponses.splice(selectedNumber - 1, 1);
                                await update(guildData);
                                await collectedMessage.reply({content: `${confirmationMessage()} removed ${selectedResponse.name} from the list of custom responses.`});
                                response = await updateSettingButtonsAndSendMessage(response, guildData, responsesEnabled, selectRow);
                                return;
                            }
                        }).catch(async (e) => {
                            await deleteMessage.edit("I ran into an error handling your reply.");
                            console.error(e);
                        });

                        break;
                    
                    case 'toggleresponses':
                        try { await buttonResponse.deferReply() } catch (e) {}
                        collected = true;
                        responsesEnabled = !responsesEnabled;
                        await buttonResponse.followUp({content: `${confirmationMessage()} custom reactions are now ${responsesEnabled ? "enabled" : "disabled"}.`, ephemeral: true});
                        guildData.messageScanning.customResponse = responsesEnabled;
                        await update(guildData);
                        break;
                }
                // Try to update message and buttons w/ new data
                try {
                    if (!addingButtons) response = await updateSettingButtonsAndSendMessage(response, guildData, responsesEnabled, selectRow);
                } catch (e) {}
                sleep(200).then(() => collected = false);
            }
        });

        buttonCollector.on('end', async c =>  {
            // Update message with buttons disabled
            try {
                if (!collected) {
                    await updateSettingButtonsAndSendMessage(response, guildData, responsesEnabled, selectRow, true);
                    await response.delete();
                }
            } catch (e) {}
        });
    } catch (e) {
        console.debug(`Error: ${e}`);
    }

}


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

const validateMessages = async (interaction: CommandInteraction, trigger: string, response: string | null): Promise<{valid: boolean, isRegex: boolean, regexTrigger: string}> => {
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
    if (response != null) {
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
    let reaction = interaction.options.getString('reaction') ? interaction.options.getString('reaction') : '';
    
    if (!name || !trigger || (!response && !reaction) || !interaction.guildId) {
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

    const reactionEmoji = await getEmoji(reaction ? reaction : '', BOT)
    
    if (response == null && reactionEmoji == null) {
        await interaction.editReply('Invalid emoji! try again.');
        return;
    }

    // Save response to database
    const num = guildData.customResponses.push({
        name: name,
        enabled: true,
        trigger: trigger,
        response: response ? response : '',
        regex: isRegex,
        reply: isReply ? isReply : true,
        channelId: channelWhitelist ? channelWhitelist.id : null,
        allowPing: allowping ? allowping : false,
        fullMessage: fullmessage ? fullmessage == 'full' ? true : false : true,
        reaction: reactionEmoji
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
            responseList += `\t\n\`${r.trigger}\`${r.fullMessage ? ` (full)` : `( partial)`} -> \`${r.response}\`${r.reaction != null ? ` + ${emojiToString(r.reaction)}` : ''}\n`
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
                        .setRequired(false)
                )
                .addStringOption((option) => 
                    option
                        .setName('reaction')
                        .setDescription('Emoji to react with')
                        .setRequired(false)
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
                if( !interaction.options.getString('response') && !interaction.options.getString('reaction')) {
                    await interaction.editReply('Please specify a response or a reaction emoji!');
                    return;
                }
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

                    // Send reaction
                    if (pattern.reaction != null) {
                        const reactionEmoji = emojiToString(pattern.reaction);
                        if (reactionEmoji != '') await message.react(reactionEmoji);
                    }

                    // Send response
                    if (pattern.response != '') {
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
                }
            } catch (e) {
                console.error(`Response ${pattern.name} is defined as regex but regex string is invalid: ${e}`);
            }
            return;
        }

        if (!pattern.fullMessage && message.content.includes(pattern.trigger)) {
            // Send reaction
            if (pattern.reaction != null) {
                const reactionEmoji = emojiToString(pattern.reaction);
                if (reactionEmoji != '') await message.react(reactionEmoji);
            }

            // Send response
            if (pattern.response != '') {
                response = pattern.response;
                if (pattern.reply) {
                    await message.reply(response);
                } else {
                    await message.channel.send(response);
                }
            }
            return;
        }

        if (pattern.trigger == message.content) {
                response = pattern.response;
                // Prevent pings
                if( !pattern.allowPing ) {
                    response = response.replaceAll("@", "");
                }
                // Send reaction
                if (pattern.reaction != null) {
                    const reactionEmoji = emojiToString(pattern.reaction);
                    if (reactionEmoji != '') await message.react(reactionEmoji);
                }
                if (pattern.reply) {
                    await message.reply(response);
                } else {
                    await message.channel.send(response);
                }
        }
    
    }
}