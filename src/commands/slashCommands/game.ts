import { SlashCommandBuilder } from "discord.js";
import { CommandInterface } from "../../interfaces/Command.js";
import { CommandStatus, broadcastCommandStatus } from "../../utils/commandUtils.js";
import { IGDbAPI, getGameByTitle } from "../../api/twitchAPI.js";
import { HowLongToBeatService, HowLongToBeatEntry } from 'howlongtobeat';
import { EmbedBuilder } from "@discordjs/builders";
import axios from "axios";
// @ts-ignore
import { default as config } from "../../config/config.json" assert { type: "json" };

// WIP: game command
/*
This will be a search, similar to /movie or /book.
Ideally, we want this to show:
 - Game synopsis, release date, studio+publisher
    - Maybe trailers?
 - Game artwork and screenshots
 - Platforms (+links)
 - HowLongToBeat
 - Average rating (IGDB and maybe metacritic)
 - Lowest price (IsThereAnyDeal)
 - Links to PCGamingWiki (if on PC)


 https://github.com/ckatzorke/howlongtobeat done
 https://api-docs.igdb.com/ ???
 https://www.pcgamingwiki.com/wiki/PCGamingWiki:API
 https://docs.isthereanydeal.com/
 https://steamcommunity.com/dev 

*/


export const game: CommandInterface = {
    data: new SlashCommandBuilder()
        .setName('game')
        .setDescription('Get information about a video game')
        .addSubcommand((subcommand) =>
            subcommand
                .setName('info')
                .setDescription('Get information about a game')
                .addStringOption((option) =>
                    option
                        .setName('query')
                        .setDescription('The game to search for')
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName('hltb')
                .setDescription('Get HowLongToBeat info about a game')
                .addStringOption((option) =>
                    option
                        .setName('query')
                        .setDescription('The game to search for')
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) => 
            subcommand
                .setName('deals')
                .setDescription('Find lowest price through key resellers')
                .addStringOption((option) =>
                    option
                        .setName('query')
                        .setDescription('The game to search for')
                        .setRequired(true)
                )
                .addStringOption((option) =>
                    option
                        .setName('platform')
                        .setDescription('The game platform')
                        .addChoices(
                            { name: 'PC', value: 'pc' },
                            { name: 'Playstation 5', value: 'playstation5'},
                            { name: 'Playstation 4', value: 'playstation4'},
                            { name: 'Xbox Series X', value: 'xboxseriesx'},
                            { name: 'Xbox One', value: 'xboxone'},
                            { name: 'Switch', value: 'switch'}
                        )
                        .setRequired(false)
                )
            
        )
    ,
    run: async (interaction) => {
        if (!interaction.isChatInputCommand() || !interaction.guildId || !interaction.guild || !interaction.channel) {
            await broadcastCommandStatus(interaction, CommandStatus.CriticallyFailed, {command: game, reason: "Invalid interaction!"});
            return;
        }

        let query: string | null;
        let res;
        switch ( interaction.options.getSubcommand() ) {
            case 'info':
                // Not yet implemented
                await interaction.editReply("This command has not yet been implemented. Sorry!");
                return;
                /*
                query = interaction.options.getString('query');
                if (query == null) {
                    await interaction.editReply(`Invalid query!`);
                    return;
                } 
                res = await getGameByTitle(query);
                if (!res) {
                    await interaction.editReply(`Something went wrong.`);
                    return;
                }

                // put embed stuff here
                */

                break;
            case 'hltb':
                query = interaction.options.getString('query');
                if (query == null) {
                    await interaction.editReply(`Invalid query!`);
                    return;
                } 
                const hltbEmbed = new EmbedBuilder();

                let hltbService = new HowLongToBeatService();
                await hltbService.search(query).then( async (result: any) => {
                    // Get first entry (highest similarity)
                    if (result.length > 0) {
                        let hltb: HowLongToBeatEntry = result.at(0)!;
                        let hltbStrings: Array<string> = [];
                        for (const timeLabel of hltb.timeLabels) {
                            switch (timeLabel.at(0)!) {
                                case 'Main':
                                    hltbStrings.push(`**${timeLabel.at(1)}**: ${hltb.gameplayMain}hrs`);
                                    break;
                                case 'Main + Extra':
                                    hltbStrings.push(`**${timeLabel.at(1)}**: ${hltb.gameplayMainExtra}hrs`);
                                    break;
                                case 'Completionist':
                                    hltbStrings.push(`**${timeLabel.at(1)}**: ${hltb.gameplayCompletionist}hrs`);
                                    break;
                            }

                        }
                        
                        hltbEmbed.addFields({
                            name: "How Long To Beat",
                            value: "- " + hltbStrings.join('\n- '),
                            inline: true
                        })
                        .setTitle(`How Long To Beat ${hltb.name}?`);
                        if (hltb.imageUrl) hltbEmbed.setThumbnail(hltb.imageUrl);
                        if (hltb.description) hltbEmbed.setDescription(hltb.description);
                        if (hltb.platforms && hltb.platforms.length > 0) hltbEmbed.addFields({
                                name: "Platforms",
                                value: "- " + hltb.platforms.join("\n- "),
                                inline: true
                            });

                        await interaction.editReply({embeds: [hltbEmbed]});
                    }
                    
                }).catch (async (e: any) => {
                    console.error(`Error fetching data from HLTB: ${e}`);
                    await interaction.editReply({content: 'An error occurred while fetching data from the HLTB API.'});
                })
                return;
        
            case 'deals':
                query = interaction.options.getString('query');
                if (query == null) {
                    await interaction.editReply(`Invalid query!`);
                    return;
                } 
                // We're using the AllKeyShopAPI whose credentials were extracted from the chrome extension
                let requestURL = `${config.game.AllKeyShopAPI.baseURL}?action=products&showOffers=1&showVouchers=false&locale=en_US&currency=USD`;
                requestURL += `&apiKey=${process.env.ALLKEYSHOP_API_KEY}&search=${query}`;
                
                try {
                    res = await axios.get(
                        requestURL, {
                            headers: {
                                accept: 'application/json'
                            }
                        }
                    );
                } catch (e) {
                    console.error(`AllKeyShop API error: ${e}`);
                    await interaction.editReply('API error!');
                    return;
                }
                if (!res 
                    || res.status !== 200 
                    || !res.data
                    || res.data.status != 'success'
                ) {
                    await interaction.editReply({content: "API error."});
                    return;
                }

                if (!res.data.info.productCount || res.data.info.productCount == 0) {
                    await interaction.editReply({content: `No results found for "${query}"`});
                    return;
                } 

                const aksEmbed = new EmbedBuilder()
                    .setTitle(`Deals for "${query}"`)
                    .setFooter({text: "These results represent the absolute lowest prices available through grey-market key resellers. Use caution and good judgement when choosing to buy game keys through these marketplaces."});
                
                let product;
                let metacriticString = "";
                // Filter out all products with price == 0 (bad results, usually)
                const allProducts = res.data.products.filter((product: any) => !product.offers.some((offer: any) => offer.price <= 0) );

                if (allProducts.length > 0) {
                    let platform = interaction.options.getString('platform');
                    if (platform) {
                        product = allProducts.find((product: any) => product.platform == platform)
                        if (!product) {
                            await interaction.editReply('No game found for this platform.');
                            return;
                        }
                    } else {
                        product = allProducts.at(0);
                    }


                    // offers
                    const offers = [];
                    let offerString, discount;
                    const productOffers = product.offers.slice(0,10).sort((a: any,b: any) => a.price - b.price);
                    for (const offer of productOffers) {
                        offerString = "";
                        discount = Math.round(parseFloat(offer.priceDiscount) * -100);
                        if (offer.priceDiscount) offerString += `[${discount > 0 ? `+${discount}` : discount}%] `;
                        offerString += `[${offer.store.name}](${offer.url})`;
                        offerString += `: ${offer.price} ${offer.currency}`                        
                        offerString += ` (${offer.edition.name}, ${offer.region.id}, ${offer.region.name})`
                    
                        offers.push(offerString);


                    }

                    if (product.metacriticScores && (product.metacriticScores.critic.votes != 0 && product.metacriticScores.user.votes != 0 && product.metacriticScores.total.votes != 0)) {
                        if (product.metacriticScores.critic) metacriticString += `Critic: ${product.metacriticScores.critic.rating}/100 (${product.metacriticScores.critic.votes} votes)\n`;
                        if (product.metacriticScores.user) metacriticString += `User: ${product.metacriticScores.user.rating}/100 (${product.metacriticScores.user.votes} votes)\n`;
                        if (product.metacriticScores.total) metacriticString += `Total: ${product.metacriticScores.total.rating}/100 (${product.metacriticScores.total.votes} votes)`;
                    }
                                            
                    if (metacriticString != "") aksEmbed.addFields({
                        name: "Metacritic",
                        value: metacriticString
                    });

                    if (offers.length > 0) aksEmbed.setDescription("- " + offers.join("\n- "));
                    else aksEmbed.setDescription('No product listings found.');
                    // data
                    if (product.name) aksEmbed.setTitle(`Deals for ${product.name}`);
                    if (product.coverImageUrl) aksEmbed.setThumbnail(product.coverImageUrl);
                    let publisherDeveloperString = "";
                    if (product.developer) publisherDeveloperString += product.developer;
                    if (product.publisher) {
                        if (publisherDeveloperString != "") publisherDeveloperString += ", "
                        publisherDeveloperString += product.publisher;
                    }
                    if (product.releaseYear) publisherDeveloperString += `(${product.releaseYear})`;
                


                    await interaction.editReply({
                        content: "",
                        embeds: [aksEmbed]
                    });
                } else {
                    await interaction.editReply("No products found.");
                    return;
                }



                break;
        }

        

        

        

        console.log("success");

    },
    properties: {
        Name: "Search Game",
        Aliases: [],
        Scope: "global",
        GuildOnly: false,
        Enabled: true,
        DefaultEnabled: true,
        CanBeDisabled: true,
        Intents: [],
        Permissions: [],
        Ephemeral: false,
    }

}