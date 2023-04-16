// Specifies options argument for Bot object, which includes parameters like intent
import { GatewayIntentBits, Partials } from "discord.js";

export const IntentOptions = [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
]

export const PartialsOptions = [
    Partials.Channel,
]