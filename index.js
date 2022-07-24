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
var updatedPlayers = false;

//Query all the servers listed in the config file
async function queryServers() {
    var address;
    var hasWhitelistBot;
    var hasStatusBot;
    var response
    var displayText;

    for(var i = 0; i < Object.keys(config["SERVERS"]).length; i++){
        var server = config["SERVERS"]["SERVER_"+(i+1)];
        address = server["ADDRESS"];
        hasWhitelistBot = server["WHITELIST_BOT"];
        hasStatusBot = server["STATUS_BOT"];
        messageId = server["MESSAGE_ID"];

        logger.logInformation("Query for server #"+(i+1));

        try {
            //Get steam server information
            response = await steam.queryGameServerInfo(address);
            if (hasWhitelistBot) {
                if(!updatedPlayers){
                    logger.logInformation("Loading players for server #"+(i+1));
                    handlePlayers(server["RCON"]);
                    updatedPlayers = true;
                }
            }
            if(hasStatusBot){
                displayText = "Current map: " + response["map"] + "\r\n Players: " + response["players"] + "/" + response["maxPlayers"] + "\r\n Public: " + (response["visibility"] ? "No" : "Yes");
                displayText = displayText + "\r\n" + await getPublicInfo(server["PUBLIC_STATS"]);
                discord.displayServer(response["name"], displayText, config["STATUS_BOT_DISCORD"]["COLOR_ONLINE"], config["STATUS_BOT_DISCORD"]["IMAGE"], config["STATUS_BOT_DISCORD"]["DC_CHANNEL_STATUS"]);
            }
        } catch(e) {
            logger.logError("Unable to load server #"+(i+1) + " :" + e);
            if(hasStatusBot){
                discord.displayServer(server["SERVERNAME"], "The server is currently offline", config["STATUS_BOT_DISCORD"]["COLOR_OFFLINE"], config["STATUS_BOT_DISCORD"]["IMAGE"], config["STATUS_BOT_DISCORD"]["DC_CHANNEL_STATUS"]);
            }
        }
    }

    Object.keys(config["SERVERS"]).forEach(server => {
        
    })
}

async function handlePlayers(urlConfig){
    //Login
    var cookies = await formatCookies(urlConfig);
    //Get online players from RCON tool
    var rconPlayers = await formatRCONPlayers(urlConfig, cookies);
    var userdata;
    var dbPlayer;
    
    for(var i = 0; i < rconPlayers.length; i++){
        //Get userdata from rcontool
        userdata = await rcon.getUserdata(urlConfig, cookies, rconPlayers[i]);
        if(userdata){
            userdata = userdata.data["result"];
        }
        //Add player to list and DB if not already there
        if(!players.includes(rconPlayers[i].toString())){
            players.push(rconPlayers[i]);
            await database.addPlayer(userdata["names"][0]["name"], rconPlayers[i].toString(), (userdata["total_playtime_seconds"] / 3600), false, 0, false, 0);
        }
        //Load player from DB
        dbPlayer = await database.loadPlayer(rconPlayers[i].toString());
        if(dbPlayer){
            updatePlayer(dbPlayer, userdata["total_playtime_seconds"], userdata["current_playtime_seconds"], rconPlayers[i], userdata["names"][0]["name"], dbPlayer["hasDonated"]);
        }
    }
    rcon.logoutRCON(urlConfig + "api/logout", cookies);
}

function updatePlayer(player, totalPlaytime, playtime, steamid, playername, hasDonated){
    var timePlayed;
    var daysPassed;
    var hasVIP = false;
    var unixPlaytime = 0;
    var unixVIP = 0;

    //Check if player reached the time played goal from config file
    timePlayed = ((totalPlaytime / 3600) - player["playtimeTotal"]) + (playtime / 3600);
    if(timePlayed >= config["WHITELIST_BOT"]["HOURS_TO_REACH"]){
        hasVIP = true;
        unixVIP = Date.now() / 1000;
    }

    //Check if player has time left to reach time goal
    daysPassed = ((Date.now() / 1000) -  player["unix_playtime"]) / 86400;
    if(daysPassed >= config["WHITELIST_BOT"]["TIME_TO_PLAY"]){
        timePlayed = 0;
        unixPlaytime = Date.now() / 1000;
    }

    if(unixVIP == 0){
        unixVIP = player["unix_vip"];
    }
    if(unixPlaytime == 0){
        unixPlaytime = player["unix_playtime"];
    }

    //Check if player has excluded nameparts
    config["WHITELIST_BOT"]["EXCLUDED"].forEach(key => {
        if(playername.search(key) != -1){
            hasVIP = true;
            unixVIP = 0;
        }
    })

    //Check if player has donated
    if(hasDonated){
        hasVIP = true;
        unixVIP = 0;
    }

    //Check if VIP has run out
    if(hasVIP){
        daysPassed = ((Date.now() / 1000) -  player["unix_vip"]) / 86400;
        if(daysPassed >= config["WHITELIST_BOT"]["VIP_AMOUNT"]){
            hasVIP = false;
            unixVIP = 0;
        }
    }

    database.updatePlayer(playername, steamid, (totalPlaytime / 3600), timePlayed, unixPlaytime, hasVIP, unixVIP);
}

async function formatCookies(urlConfig){
    var result = await rcon.loginRCON(urlConfig + "api/login");
    if(result){
        result = result["headers"]["set-cookie"][0].split(';')[0] + "; " + result["headers"]["set-cookie"][1].split(';')[0];
    }
    return result;
}

async function formatRCONPlayers(urlConfig, cookies){
    var result = await rcon.getRCONPlayers(urlConfig, cookies);
    var rconPlayers = Array();
    if(result){
        result = result.data["result"]["stats"].forEach(player => {
            rconPlayers.push(player["steam_id_64"]);
        });
    }
    return rconPlayers;
}

async function getPublicInfo(url){
    var result = "";
    if(url != "none"){
        logger.logInformation("Getting public stats from: " + url);
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

async function run() {
    var today;
    while (true) {
        if (config == null) {
            try {
                config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
                logger.logInformation("Loaded configuration");
                await discord.startBot(config);
                logger.logInformation("Preparing database and loading steam ids");
                players = await database.loadSteamIDs();
            } catch (e) {
                if(e.search("ERROR") != -1){
                    logger.logError(e.replace("ERROR:", ""));
                }
                else{
                    logger.logError("Unable to load config file. Please contact your system administrator");
                }
                break;
            }
        }
        logger.logInformation("Starting server query");
        discord.clearStatusChannel(config["STATUS_BOT_DISCORD"]["DC_CHANNEL_STATUS"]);
        queryServers();
        logger.logInformation("Waiting " + config["REFRESH_TIME"] + " seconds until next query");
        await new Promise(r => setTimeout(r, config["REFRESH_TIME"] * 1000));
        today = new Date();
        if(today.getHours == 1 && (today.getMinutes > 0 && today.getMinutes < 5)){
            if(updatedPlayers){
                updatedPlayers = false;
            }
        }
    }
}

run();