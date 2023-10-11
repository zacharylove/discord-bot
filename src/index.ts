
import Bot from "./bot.js";
import { onInteraction } from "./events/onInteraction.js";
import { IntentOptions, PartialsOptions } from "./config/IntentOptions.js";
import { connectDatabase } from "./database/connectDatabase.js";
import { validateEnv, validateEventPermissions } from "./utils/validateProperties.js";
import { onReady } from "./events/onReady.js";
import { onMessage } from "./events/onMessage.js";
import { Events } from "discord.js";
import { onMessageReactionAdd, onMessageReactionRemove } from "./events/onMessageReaction.js";


let BOT: Bot;


const registerEvents = async (BOT: Bot) => {
    if (validateEventPermissions(onReady.properties)) {
        BOT.on(Events.ClientReady, async () => await onReady.run(BOT));
    } else { console.log("onReady event is disabled. Skipping..."); }

    if (validateEventPermissions(onInteraction.properties)) {
        BOT.on(Events.InteractionCreate, async (interaction) => await onInteraction.run(interaction));
    } else { console.log("interactionCreate event is disabled. Skipping..."); }

    if (validateEventPermissions(onMessage.properties)) {
        BOT.on(Events.MessageCreate, async (Message) => await onMessage.run(Message, BOT))
    } else { console.log("messageCreate event is disabled. Skipping..."); }

    if (validateEventPermissions(onMessageReactionAdd.properties)) {
        BOT.on(Events.MessageReactionAdd, async (reaction, user) => await onMessageReactionAdd.run(reaction, user));
    } else { console.log("messageReactionAdd event is disabled. Skipping..."); }

    if (validateEventPermissions(onMessageReactionRemove.properties)) {
        BOT.on(Events.MessageReactionRemove, async (reaction, user) => await onMessageReactionRemove.run(reaction, user));
    } else { console.log("messageReactionAdd event is disabled. Skipping..."); }
}


// This anonymous immediately-invoked function expression (IIFE) is the entry point of program
(async () => {
    if (!await validateEnv()) return; 

    BOT = new Bot({ intents: IntentOptions, partials: PartialsOptions });

    await connectDatabase();

    await registerEvents(BOT);

    await BOT.login(process.env.BOT_TOKEN);

   
})();

export { BOT }