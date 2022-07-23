require('dotenv').config();

const steam = require("steam-server-query");
const yaml = require('js-yaml');
const fs = require('fs');
const axios = require('axios');

const logger = require('./logger');
const discord = require("./discord");
const database = require("./database");
const rcon = require("./RCONConnector");

var config;
var players = Array();
var vips = Array();

async function queryServers() {
    var address;
    var hasWhitelistBot;
    var hasStatusBot;
    var response
    var displayText;
    var messageId;

    Object.keys(config["SERVERS"]).forEach(server => {
        address = config["SERVERS"][server]["ADDRESS"];
        hasWhitelistBot = config["SERVERS"][server]["WHITELIST_BOT"];
        hasStatusBot = config["SERVERS"][server]["STATUS_BOT"];
        messageId = config["SERVERS"][server]["MESSAGE_ID"];

        logger.logInformation("Query for server: "+server);

        try {
            response = steam.queryGameServerInfo(address);
            if (hasWhitelistBot) {
                logger.logInformation("Loading players for server "+server);
                steam.queryGameServerPlayer(address).then(playerResponse => {
                    handlePlayers(playerResponse, config["SERVERS"][server]["RCON"]);
                }).catch((err) => {
                    logger.logError("Unable to load players from server "+server);
                });
            }
            if(hasStatusBot){
                displayText = "Current map: " + response["map"] + "\r\n Players: " + response["players"] + "/" + response["maxPlayers"] + "\r\n Public: " + (response["visibility"] ? "No" : "Yes");
                displayText = displayText + "\r\n" + getPublicInfo(config["SERVERS"][server]["PUBLIC_STATS"]);
                discord.displayServer(response["name"], displayText, config["STATUS_BOT_DISCORD"]["COLOR_ONLINE"], config["STATUS_BOT_DISCORD"]["IMAGE"], messageId);
            }
        } catch(e) {
            if(hasStatusBot){
                discord.displayServer(config["SERVERS"][server]["SERVERNAME"], "The server is currently offline", config["STATUS_BOT_DISCORD"]["COLOR_OFFLINE"], config["STATUS_BOT_DISCORD"]["IMAGE"], messageId);
            }
        }
    })
}

async function handlePlayers(steamPlayers, urlConfig){
    var cookies = await rcon.loginRCON(urlConfig + "api/login");
    //var rconPlayers = rcon.getRCONPlayers(urlConfig, cookies);
    var vips = rcon.getVIPs(urlConfig, cookies);
    //console.log(steamPlayers);
    rcon.logoutRCON(urlConfig + "api/logout", cookies);
}

async function getPublicInfo(url){
    var result = "";
    if(url != "none"){
        logger.logInformation("Getting public stats from: " + url);
        var response = await axios(url);
        var start = response.data.result.current_map.start;
        var nextMap = response.data.result.next_map;
        var playtimeSeconds = (Date.now() / 1000) - start;
        var playtimeMinutes = Math.floor(playtimeSeconds / 60)
        playtimeSeconds = Math.floor(playtimeSeconds % 60);
        if(playtimeMinutes.toString().length < 2){
            if(playtimeMinutes < 10){
                playtimeMinutes = "0" + playtimeMinutes;
            }
            else{
                playtimeMinutes = playtimeMinutes + "0";
            }
        }
        if(playtimeSeconds.toString().length < 2){
            if(playtimeSeconds < 10){
                playtimeSeconds = "0" + playtimeSeconds;
            }
            else{
                playtimeSeconds = playtimeSeconds + "0";
            }
        }

        if(playtimeMinutes > 95){
            result = "Time played: Not started \r\n";
        }
        else{
            result = "Time played: " + playtimeMinutes + ":" + playtimeSeconds + "\r\n";
        }
        
        result = result + "Next map: " + nextMap;
    }
    return result;
}

function isClanMember(keywords){
    for(var i = 0; i < keywords.length; i++){
        if(this.username.search(keywords[i])){
            return true;
        }
    }
    return false;
}

function shouldGiveVIP(daysMax){
    var seconds = (Date.now() / 1000) - this.timestamp_playtime;
    var days = seconds / (60 * 60 * 24);
    if(days >= daysMax){
        return true;
    }
    return false;
}

function shouldRemoveVIP(daysMax){
    if(!this.hasDonated){
        var seconds = (Date.now() / 1000) - this.timestamp_vip;
        var days = seconds / (60 * 60 * 24);
        if(days >= daysMax){
            return true;
        }
    }
    return false;
}

async function run() {
    while (true) {
        if (config == null) {
            try {
                config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
                logger.logInformation("Loaded configuration");
                discord.createWebhook(config["STATUS_BOT_DISCORD"]["WEBHOOK"]);
                logger.logInformation("Webhook created");
                if(!discord.checkMessageIds(config)){
                    discord.prepareDiscord(Object.keys(config["SERVERS"]).length);
                    logger.logInformation("Messages generated. Copy the messageID from the messages and add them to the config file. Restart the bot afterwards.");
                    break;
                }
                logger.logInformation("Preparing database and loading players");
                players = database.loadPlayers();
            } catch (e) {
                logger.logError("Unable to load config file. Please contact your system administrator");
                break;
            }
        }

        logger.logInformation("Starting server query");
        await queryServers();
        logger.logInformation("Waiting " + config["REFRESH_TIME"] + " seconds until next query");
        await new Promise(r => setTimeout(r, config["REFRESH_TIME"] * 1000));
    }
}

run();