import { CommandInterface, CommandProperties } from '../interfaces/Command';
import { SlashCommandBuilder } from "@discordjs/builders";
import { getUserData } from '../database/userData';
import { BOT } from '../index';
import { send } from 'process';

export const poke: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('poke')
        .setDescription('Poke someone!')
        .addUserOption((option) =>
            option
                .setName('user')
                .setDescription('The user to poke')
                .setRequired(false)
        ),
    run: async (interaction) => {
        // Get user to poke
        const userToPoke = interaction.options.getUser('user');
        const callingUser = await getUserData(interaction.user.id);

        const pokedMe: boolean = userToPoke == BOT.user;

        var replyString = '';
        if (pokedMe) replyString += 'Hey! ';
        replyString += 'You poked ';

        callingUser.numPokes++;
        let targetMilestone: string = "";
        if (userToPoke) {
            const targetUser = await getUserData(userToPoke.id);
            if (pokedMe) replyString += `me! I've `;
            else replyString += `<@${userToPoke.id}>! They have `;
            targetUser.numPoked++;
            replyString += `been poked ${targetUser.numPoked} time!`
            if ( targetUser.numPoked > 1 ) replyString += 's!';
            await targetUser.save();

            // Add some text for milestone poke recipient numbers
            switch (targetUser.numPoked) {
                case 1: targetMilestone += `That's their first poke ever!`; break;
                case 10: targetMilestone += `Nice!`; break;
                case 100: targetMilestone += `Oh wow!`; break;
                case 150: targetMilestone += `Man, they must be sore!`; break;
                case 500: targetMilestone += `500?? Damn, they're popular!`; break;
                case 1000: targetMilestone += `1000?! They must be a celebrity!`; break;
            }
        } else {
            replyString += 'yourself!';
            replyString += ` You have been poked ${callingUser.numPokes} times!`
        }
        await callingUser.save();

        // Add some text for milestone poke sender numbers
        let senderMilestone: string = "";
        switch (callingUser.numPokes) {
            case 1: senderMilestone += `That's your first poke ever!`; break;
            case 10: senderMilestone += `Nice! Poked 10 people! Keep it up :)`; break;
            case 100: senderMilestone += `That's your 100th poke!`; break;
            case 150: senderMilestone += `M-m-m-monster poke! That's your 150th poke!`; break;
            case 500: senderMilestone += `500 people have been poked by your hand!`; break;
            case 1000: senderMilestone += `Woah, that's your 1,000th poke! You must really like pinging people!`; break;
            case 10000: senderMilestone += `You've poked 10,000 people! A- are you okay?`; break;
            case 100000: senderMilestone += `You've poked 100000 people! Someone's gotta stop you, man!`; break;
        }

        if (senderMilestone != "") replyString += "\n" + senderMilestone;
        if (targetMilestone != "") replyString += "\n" + targetMilestone;

        await interaction.editReply(replyString);
        return;

    },

    // Define command properties
    properties: {
        Name: 'Poke',
        Scope: 'global',
        GuildOnly: false,
        Enabled: true,
        DefaultEnabled: true,
        Intents: []

    }
};