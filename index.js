require('dotenv').config();

const steam = require("steam-server-query");

const axios = require('axios');

const logger = require('./logger');
const database = require("./database");
const rcon = require("./RCONConnector");
const response = require("./responseHandler");
const config = require('./configLoader');
const time = require('./timeFormatter');
const Player = require("./player");
const api = require("./APIHandler");

var players = Array();

//Query all the servers listed in the config file
async function queryServers() {
    var address;
    var hasWhitelistBot;
    var hasStatusBot;
    var response
    var displayText;

    for(var i = 0; i < Object.keys(config.getConfig()["SERVERS"]).length; i++){
        if(updatedPlayers[i] == null){
            updatedPlayers[i] = false;
        }
        var server = config.getConfig()["SERVERS"]["SERVER_"+(i+1)];
        address = server["ADDRESS"];
        hasWhitelistBot = server["WHITELIST_BOT"];
        hasStatusBot = server["STATUS_BOT"];
        messageId = server["MESSAGE_ID"];

        logger.logInformation("[GENERAL] Query for server #"+(i+1));

        try {
            //Get steam server information
            response = await steam.queryGameServerInfo(address);
            if (hasWhitelistBot) {
                logger.logInformation("[VIP] Loading players for server #"+(i+1));
                handlePlayers(server["RCON"]);
            }
            if(hasStatusBot){
                displayText = "Current map: " + response["map"] + "\r\n Players: " + response["players"] + "/" + response["maxPlayers"] + "\r\n Public: " + (response["visibility"] ? "No" : "Yes");
                displayText = displayText + "\r\n" + await getPublicInfo(server["PUBLIC_STATS"]);
                api.sendMessage(response["name"], config.getConfig()["DISCORD"]["COLOR_SUCCESS"], "Last check: " + time.getToday(), displayText, config.getConfig()["DISCORD"]["STATUS_IMAGE"], "empty", config.getConfig()["DISCORD"]["STATUS"]);
            }
        } catch(e) {
            logger.logError("[GENERAL] Unable to load server #"+(i+1) + " :" + e);
            if(hasStatusBot){
                api.sendMessage(server["SERVERNAME"], config.getConfig()["DISCORD"]["COLOR_ERROR"], "Last check: " + time.getToday(), "The server is currently offline", displayText, config.getConfig()["DISCORD"]["STATUS_IMAGE"], "empty", config.getConfig()["DISCORD"]["STATUS"]);
            }
        }
    }
}

async function handlePlayers(urlConfig){
    await new Promise(r => setTimeout(r, config.getConfig()["REFRESH_TIME"] * 5000));
    //Login
    var result = await rcon.loginRCON(urlConfig + "api/login");
    var cookies = await response.formatCookies(result);
    //Get online players from RCON tool
    result = await rcon.getRCONPlayers(urlConfig, cookies);
    var rconPlayers = await response.formatRCONPlayers(result);
    var userdata;
    var username = "";
    var playerExists;
    var isTagged = false;
    
    for(var i = 0; i < rconPlayers.length; i++){
        playerExists = false;
        //Get userdata from rcontool
        userdata = await rcon.getUserdata(urlConfig, cookies, rconPlayers[i]);
        
        if(userdata){
            userdata = userdata.data["result"];
        }

        if(userdata == null) continue;

        for(var player in players){
            if(player.steamid == rconPlayers[i]){
                playerExists = true;
                if(!player.hasDonated && !player.hasTag){
                    player.updatePlaytime(time.getHoursFromSeconds(userdata["total_playtime_seconds"]));
                    player.hasVIP();
                }
                break;
            }
        }

        if(!playerExists){
            username = await api.getUsername(userdata["steamid"]);
            //Check if player has excluded nameparts
            for(var key in config.getConfig()["VIP_BOT"]["EXCLUDED"]){
                if(username.includes(key)){
                    isTagged = true;
                    break;
                }
            }
            players.push(new Player(userdata["steamid"], time.getHoursFromSeconds(userdata["total_playtime_seconds"]), 0, new Date(), 0, false, isTagged));
        }
    }
    rcon.logoutRCON(urlConfig + "api/logout", cookies);
}

async function getPublicInfo(url){
    var result = "";
    if(url != "none"){
        logger.logInformation("[STATUS] Getting public stats from: " + url);
        var response = await axios(url);
        var start = response.data["result"]["current_map"]["start"];
        var nextMap = response.data["result"]["next_map"];
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

async function savePlayers(){
    await new Promise(r => setTimeout(r, config.getConfig()["REFRESH_TIME"] * 5000));
    players.forEach(player => {
        database.savePlayer(player);
    });
}

async function run() {
    while (true) {
        if (config == null) {
            logger.setLogLevel();
            logger.logInformation("[GENERAL] Loaded configuration");
            logger.logInformation("[GENERAL] Preparing database and loading steam ids");
            var playerArray = await database.loadPlayers();
            for(var player in playerArray){
                players.push(new Player(player["steamid"], player["playtimeTotal"], player["playtime"], player["unix_playtime"], player["unix_vip"], player["hasDonated"], player["hasTag"]));
            }
        }
        logger.logInformation("[GENERAL] Starting server query");
        await api.removeMessages(10);
        await queryServers();
        logger.logInformation("[GENERAL] Waiting " + config.getConfig()["REFRESH_TIME"] + " seconds until next query");
        logger.sendToDiscord();
        await new Promise(r => setTimeout(r, config.getConfig()["REFRESH_TIME"] * 1000));
        savePlayers();
    }
}

run();