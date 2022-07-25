require('dotenv').config();

const { Client, GatewayIntentBits } = require("discord.js");

const logger = require('./logger');
const database = require("./database");

var channelStatus;
var channelPublic;
var channelAdmin;

var rolePing;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ], partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

async function startBot(config, players) {
    client.once('ready', c => {
        channelStatus = c.channels.cache.get(config["STATUS_BOT_DISCORD"]["DC_CHANNEL_STATUS"])
        channelPublic = c.channels.cache.get(config["WHITELIST_BOT"]["DC_CHANNEL_PUBLIC"])
        channelAdmin = c.channels.cache.get(config["WHITELIST_BOT"]["DC_CHANNEL_ADMIN"])
        rolePing = config["WHITELIST_BOT"]["ROLE_ID"];
        logger.logInformation(`[GENERAL] Discord-bot ready! Logged in as ${c.user.tag}`)
        clearStatusChannel();
    });

    client.on('messageCreate', message => {
        if (message.author.bot) return;
        if (message.channel != channelPublic) return;
        if (message.content.length != 17) return;
        if (!(/^[0-9]+$/.test(message.content))) return;

        if(players.includes(message.content)){
            //username, steamid, playtimeTotal, playtime, unix_playtime, hasVIP, unix_vip, hasDonated, unix_donation
            database.loadPlayer(message.content).then((dbPlayer) => {
                var text = "";
                //Player donated to the server
                if(dbPlayer["hasDonated"]){
                    text = config["WHITELIST_BOT"]["MESSAGE_DONATION"];
                }
                else{
                    //Player already has VIP;
                    if(dbPlayer["hasVIP"]){
                        //Player is excluded due to config
                        if(dbPlayer["unix_vip"] == 0){
                            text = config["WHITELIST_BOT"]["MESSAGE_EXCLUDED"];
                        }
                        //Player earned his VIP already
                        else{
                            var daysLeft = config["WHITELIST_BOT"]["VIP_AMOUNT"] - (((Date.now() / 1000) -  dbPlayer["unix_vip"]) / 86400);
                            text = config["WHITELIST_BOT"]["MESSAGE_GIVE_VIP"] + "\r\nTime left: " + daysLeft.toFixed(1);
                            logger.logVIP("Player " + dbPlayer["username"] + " with steamid " + message.content + " got VIP");
                        }
                    }
                    //Player doesn't have VIP;
                    else{
                        var daysLeft = config["WHITELIST_BOT"]["TIME_TO_PLAY"] - (((Date.now() / 1000) -  dbPlayer["unix_playtime"]) / 86400);
                        text = config["WHITELIST_BOT"]["MESSAGE_DENY_VIP"] + "\r\nTime left: " + daysLeft.toFixed(1) + " days\r\nCurrent hours: " + dbPlayer["playtime"].toFixed(1) + "/" + config["WHITELIST_BOT"]["HOURS_TO_REACH"];
                        logger.logVIP("Player " + dbPlayer["username"] + " with steamid " + message.content + " doesn't have VIP anymore");
                    }
                }
                sendResponse(dbPlayer["username"], config["WHITELIST_BOT"]["COLOR_SUCCESS"], text, config["WHITELIST_BOT"]["IMAGE"]);
            }); 
        }
        else{
            sendResponse(message.content, config["WHITELIST_BOT"]["COLOR_ERROR"], "SteamID not valid/not in database", config["WHITELIST_BOT"]["IMAGE"]);
        }
    });

    client.on("error", error => {
        logger.logError("Discord bot not working properly: " + error);
    });

    return client.login(process.env.BOT_TOKEN);
}

function sendResponse(playername, color, text, image){
    const embed = {
        title: "Whitelist bot VIP check",
        color: color,
        fields: [
            {
                "name": playername,
                "value": text,
                "inline": true
            }
        ],
        image: {
            url: image,
        },
    }
    channelPublic.send({ embeds: [embed] });
}

async function displayServer(servername, displayText, color, image, dateFormat) {
    logger.logInformation("[STATUS] Updating discord status for: " + servername);
    const embed = {
        title: servername,
        color: color,
        fields: [
            {
                "name": "Last check: " + getToday(dateFormat),
                "value": displayText,
                "inline": true
            }
        ],
        image: {
            url: image,
        },
    }
    channelStatus.send({ embeds: [embed] });
}

async function clearStatusChannel() {
    if(client.isReady()){
        await channelStatus.bulkDelete(10, true);
    }
}

function getToday(dateFormat) {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();
    var hours = today.getHours();
    if (hours.toString().length < 2) {
        hours = "0" + hours;
    }
    var minutes = today.getMinutes();
    if (minutes.toString().length < 2) {
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        else {
            minutes = minutes + "0";
        }
    }
    var seconds = today.getSeconds();
    if (seconds.toString().length < 2) {
        if (seconds < 10) {
            seconds = "0" + seconds;
        }
        else {
            seconds = seconds + "0";
        }
    }

    switch(dateFormat){
        case 1:
            today = dd + '/' + mm + '/' + yyyy + " - " + hours + ":" + minutes + ":" + seconds;
            break;
        case 2:
            today = mm + '/' + dd + '/' + yyyy + " - " + hours + ":" + minutes + ":" + seconds;
            break;
        case 3:
            today = dd + '-' + mm + '-' + yyyy + "   " + hours + ":" + minutes + ":" + seconds;
            break;
        case 4:
            today = mm + '-' + dd + '-' + yyyy + "   " + hours + ":" + minutes + ":" + seconds;
            break;
        default:
            today = dd + '.' + mm + '.' + yyyy + " - " + hours + ":" + minutes + ":" + seconds;
            break;
    }
    
    return today;
}

function sendLog(message){
    var color = 3426654;
    var embed = {
        title: "Serverbot log VIP",
        color: color,
        fields: [
            {
                "name": "VIP check",
                "value": message,
                "inline": true
            }
        ]
    }
    channelAdmin.send({ content: '<@&' + rolePing + '>', embeds: [embed] });
}

module.exports = { startBot, displayServer, clearStatusChannel,sendLog};