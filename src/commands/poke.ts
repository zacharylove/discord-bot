import { CommandInterface, CommandProperties } from '../interfaces/Command';
import { SlashCommandBuilder } from "@discordjs/builders";
import { getUserData } from '../database/userData';

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

        var replyString = 'You poked ';

        callingUser.numPokes++;
        
        if (userToPoke) {
            const targetUser = await getUserData(userToPoke.id);
            replyString += `${userToPoke.tag}!`;
            targetUser.numPoked++;
            replyString += ` They have been poked ${targetUser.numPoked} times!`
            await targetUser.save();
        } else {
            replyString += 'yourself!';
            replyString += ` You have been poked ${callingUser.numPokes} times!`
        }
        await callingUser.save();

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