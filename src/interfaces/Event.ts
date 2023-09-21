// Interface for all events

import { GatewayIntentBits, Partials } from "discord.js";

export interface EventProperties {
    // Name of event
    Name: string;
    // Whether event is enabled or disabled
    Enabled: boolean;
    // Any intents required for event to function
    Intents?: GatewayIntentBits[];
    // Partial intents required for event to function
    Partials?: Partials[];

}

export interface EventInterface {
    // Event callback function, any arguments but must be async and return nothing
    run: (...args: any[]) => Promise<void>;
    // Event properties
    properties: EventProperties;
}