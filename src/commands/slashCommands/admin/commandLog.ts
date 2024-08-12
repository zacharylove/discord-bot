import { ActionRowBuilder, ButtonStyle, ComponentType, EmbedBuilder, Message, MessageActionRowComponentBuilder, PermissionsBitField, SlashCommandBuilder } from "discord.js";
import { CommandInterface } from "../../../interfaces/Command.js";
import { hasPermissions } from "../../../utils/userUtils.js";
import { getCommandByName, getDateTimeString, sleep } from "../../../utils/utils.js";
import { CommandLog, GuildDataInterface } from "../../../database/models/guildModel.js";
import { getCommandLogLength, getFilteredCommandLog, getGuildDataByGuildID } from "../../../database/guildData.js";
import { ButtonBuilder } from "@discordjs/builders";


const requiredPermissions = PermissionsBitField.Flags.ManageGuild;
const numResultsPerPage = 10;

const createEmbed = async (interaction: Message<boolean>, logs: CommandLog[], totalPages: number, currentPage: number, commandQuery: CommandInterface | null) => {
    const embed = new EmbedBuilder();
    embed.setTitle(`Command Logs for ${commandQuery ? `"${commandQuery.properties.Name}" in ` : ''}${interaction.guild?.name}`);
    embed.setFooter({text: `Page ${currentPage + 1}/${totalPages}`});

    let description = "";
    for (const command of logs) {
        description += `- [${getDateTimeString(command.timestamp)}] ${!commandQuery ? `**${command.displayName != undefined ? command.displayName : command.commandName}** -` : ''} <@${command.callingUserId}> in <#${command.channelId}>\n`
    }
    embed.setDescription(description);
    return embed;
}


const sendEmbedAndCollectResponses = async (interaction: Message<boolean>, authorId: string, guildData: GuildDataInterface, totalPages: number, commandQuery: CommandInterface | null, currentPage: number) => {
    
    
    let logResults = await getFilteredCommandLog(guildData, commandQuery);
    if (commandQuery) totalPages = Math.ceil(logResults.length / numResultsPerPage);
    if (logResults.length == 0) {
        await interaction.edit({content: "No results found."});
        return;
    }
    logResults = logResults.slice(currentPage * numResultsPerPage,currentPage * numResultsPerPage + numResultsPerPage);
    const embed = await createEmbed(interaction, logResults, totalPages, currentPage, commandQuery);
    // Only show page controls if there is more than one page
  
    const row: ActionRowBuilder<MessageActionRowComponentBuilder> = new ActionRowBuilder();
    if (totalPages > 1) {
        const prevButton = new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('Prev')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage == 0);
        row.addComponents(prevButton);
        const nextButton = new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(currentPage == totalPages - 1);
        row.addComponents(nextButton);
    }
    const doneButton = new ButtonBuilder()
        .setCustomId('done')
        .setLabel('Done')
        .setStyle(ButtonStyle.Secondary)
    ;
    row.addComponents(doneButton);
    

    const response = await interaction.edit({content: "Here's what I found:", embeds: [embed], components: [row]})

    try {
        const buttonCollectorFilter = (i: { user: { id: string; }; }) => i.user.id === authorId;
        const buttonCollector = response.createMessageComponentCollector({ componentType: ComponentType.Button, filter: buttonCollectorFilter, time: 60000});
        
        // Preventing race conditions from spamming
        let collected: boolean = false;
        buttonCollector.on('collect', async buttonResponse => {
            if (buttonResponse.user.id == authorId && !collected) {
                if (buttonResponse && !buttonResponse.deferred) {
                    try {
                        await buttonResponse.deferUpdate();
                    } catch (e) {}
                }
                switch (buttonResponse.customId) {
                    case 'next': 
                        collected = true;
                        currentPage++;
                        sleep(200).then( async () => { await sendEmbedAndCollectResponses(response, authorId, guildData, totalPages, commandQuery, currentPage); });
                        break;
                    case 'prev':
                        collected = true;
                        currentPage--;
                        sleep(200).then( async () => { await sendEmbedAndCollectResponses(response, authorId, guildData, totalPages, commandQuery, currentPage); });
                        break;
                    case 'done':
                        collected = true;
                        sleep(200).then( async () => {await response.delete();})
                        break;
                }
            }
        }); 

        buttonCollector.on('end', collected => console.debug(`Collected ${collected.size} items`));
    } catch (e) {
        console.debug(`Error: ${e}`);
    }

}


export const commandLog: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('commandlog')
        .setDescription('View logged commands for this server')
        .addStringOption((option) => 
            option
                .setName('command')
                .setDescription('Filter by specific command')
                .setRequired(false)
        ),
    run: async (interaction) => {
        // Disable context menu
        if (!interaction.isChatInputCommand()) {
            await interaction.editReply('This command cannot be used in a context menu');
            return;
        }
        if(!hasPermissions(requiredPermissions, interaction.guild!, interaction.user)) {
            await interaction.editReply(`This command can only be run by administrators or users with the \`Manage Guild\` permission.`);
            return;
        }
        const commandName = interaction.options.getString('command');
        let command = null;
        if (commandName != null) {
            command = getCommandByName(commandName);
            if (command == null) {
                await interaction.editReply(`The command ${commandName} does not correspond to any valid command name.`);
                return;
            }
        }

        const guildData = await getGuildDataByGuildID(interaction.guildId!);
        const message: Message<boolean> = await interaction.editReply("Fetching guild settings, please wait...");
        const numResults = await getCommandLogLength(guildData);

        if (numResults == 0) {
            await interaction.editReply("There are no logged commands for this server.");
            return;
        }

        const totalNumPages = Math.ceil(numResults / numResultsPerPage)

        await sendEmbedAndCollectResponses(message, interaction.user.id, guildData, totalNumPages, command, 0);

    },
    properties: {
        Name: "Command Log",
        Aliases: [],
        Scope: "guild",
        GuildOnly: false,
        Enabled: true,
        DefaultEnabled: true,
        CanBeDisabled: false,
        Intents: [],
        Permissions: [],
        Ephemeral: false,
    }
}