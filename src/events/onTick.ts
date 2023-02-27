// Runs this event every set interval
import { Client } from "discord.js";
import { EventInterface } from "interfaces/Event";

// This event is run in onReady
export const onTick : EventInterface = {
    run: async (BOT: Client) => {
        //console.log("Tick");

        return;
    },
    properties: {
        Name: "onTick",
        Enabled: false,
    }
}