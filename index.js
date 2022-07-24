require('dotenv').config();

const steam = require("steam-server-query");
const yaml = require('js-yaml');
const fs = require('fs');
const axios = require('axios');
const utf8 = require('utf8');

const logger = require('./logger');
const discord = require("./discord");
const database = require("./database");
const rcon = require("./RCONConnector");
const response = require("./responseHandler");

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

        logger.logInformation("[GENERAL] Query for server #"+(i+1));

        try {
            //Get steam server information
            response = await steam.queryGameServerInfo(address);
            if (hasWhitelistBot) {
                if(!updatedPlayers){
                    logger.logInformation("[WHITELIST] Loading players for server #"+(i+1));
                    handlePlayers(server["RCON"]);
                    updatedPlayers = true;
                }
                else{
                    addPlayerToDB(server["RCON"]);
                }
            }
            if(hasStatusBot){
                displayText = "Current map: " + response["map"] + "\r\n Players: " + response["players"] + "/" + response["maxPlayers"] + "\r\n Public: " + (response["visibility"] ? "No" : "Yes");
                displayText = displayText + "\r\n" + await getPublicInfo(server["PUBLIC_STATS"]);
                discord.displayServer(response["name"], displayText, config["STATUS_BOT_DISCORD"]["COLOR_ONLINE"], config["STATUS_BOT_DISCORD"]["IMAGE"]);
            }
        } catch(e) {
            logger.logError("[GENERAL] Unable to load server #"+(i+1) + " :" + e);
            if(hasStatusBot){
                discord.displayServer(server["SERVERNAME"], "The server is currently offline", config["STATUS_BOT_DISCORD"]["COLOR_OFFLINE"], config["STATUS_BOT_DISCORD"]["IMAGE"]);
            }
        }
    }
}

async function handlePlayers(urlConfig){
    //Login
    var result = await rcon.loginRCON(urlConfig + "api/login");
    var cookies = await response.formatCookies(result);
    //Get online players from RCON tool
    result = await rcon.getRCONPlayers(urlConfig, cookies);
    var rconPlayers = await response.formatRCONPlayers(result);
    var vips = await rcon.getVIPs(urlConfig, cookies);
    vips = vips.data;
    var userdata;
    var dbPlayer;
    var username = "";
    
    for(var i = 0; i < rconPlayers.length; i++){
        //Get userdata from rcontool
        userdata = await rcon.getUserdata(urlConfig, cookies, rconPlayers[i]);
        
        if(userdata){
            userdata = userdata.data["result"];
        }
        if(userdata != null){
            username = utf8.encode(userdata["names"][0]["name"]);
        }
        //Add player to list and DB if not already there
        if(!players.includes(rconPlayers[i].toString())){
            try{
                if(userdata != null){
                    players.push(rconPlayers[i]);
                    await database.addPlayer(rconPlayers[i].toString(), (userdata["total_playtime_seconds"] / 3600), false, 0, false, 0, username);
                }
            }catch(ex){
                logger.logError("[WHITELIST] " + ex);
            }
        }
        //Load player from DB
        dbPlayer = await database.loadPlayer(rconPlayers[i].toString());
        if(dbPlayer){
            updatePlayer(dbPlayer, userdata["total_playtime_seconds"], userdata["current_playtime_seconds"], rconPlayers[i], dbPlayer["hasDonated"], username);
        }
    }

    rcon.logoutRCON(urlConfig + "api/logout", cookies);
}

async function addPlayerToDB(urlConfig){
    //Login
    var result = await rcon.loginRCON(urlConfig + "api/login");
    var cookies = await response.formatCookies(result);
    //Get online players from RCON tool
    result = await rcon.getRCONPlayers(urlConfig, cookies);
    var rconPlayers = await response.formatRCONPlayers(result);
    var userdata;
    var dbPlayer;
    var username = "";
    
    for(var i = 0; i < rconPlayers.length; i++){
        //Get userdata from rcontool
        userdata = await rcon.getUserdata(urlConfig, cookies, rconPlayers[i]);
        if(userdata){
            userdata = userdata.data["result"];
        }
        if(userdata != null){
            username = utf8.encode(userdata["names"][0]["name"]);
        }
        //Add player to list and DB if not already there
        if(!players.includes(rconPlayers[i].toString())){
            try{
                if(userdata != null){
                    players.push(rconPlayers[i]);
                    await database.addPlayer(rconPlayers[i].toString(), (userdata["total_playtime_seconds"] / 3600), false, 0, false, 0, username);
                }
            }catch(ex){
                logger.logError("[WHITELIST] " + ex);
            }
        }
    }
    rcon.logoutRCON(urlConfig + "api/logout", cookies);
}

function updatePlayer(player, totalPlaytime, playtime, steamid, hasDonated, playername){
    var timePlayed;
    var daysPassed;
    var hasVIP = false;
    var unixPlaytime = 0;
    var unixVIP = 0;

    //Check if VIP has run out
    if(hasVIP){
        if(unixVIP != 0){
            daysPassed = ((Date.now() / 1000) -  player["unix_vip"]) / 86400;
            if(daysPassed >= config["WHITELIST_BOT"]["VIP_AMOUNT"]){
                hasVIP = false;
                unixVIP = 0;
            }
        }
    }

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
        if(playername.includes(key)){
            hasVIP = true;
            unixVIP = 0;
        }
    })

    //Check if player has donated
    if(hasDonated){
        hasVIP = true;
        unixVIP = 0;
    }

    database.updatePlayer(steamid, (totalPlaytime / 3600), timePlayed, unixPlaytime, hasVIP, unixVIP, playername);
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

async function run() {
    var today;
    while (true) {
        if (config == null) {
            try {
                config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
            } catch (e) {
                logger.logError("[GENERAL] Unable to load config file. Please contact your system administrator");
                break;
            }
            players = await database.loadSteamIDs();
            await discord.startBot(config, players);
            logger.logInformation("[GENERAL] Loaded configuration");
            logger.logInformation("[GENERAL] Preparing database and loading steam ids");
        }
        logger.logInformation("[GENERAL] Starting server query");
        await discord.clearStatusChannel();
        await queryServers();
        logger.logInformation("[GENERAL] Waiting " + config["REFRESH_TIME"] + " seconds until next query");
        logger.sendToDiscord(discord);
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