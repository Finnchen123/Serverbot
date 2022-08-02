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
var isSaved = false;
var messages = Array();

//Query all the servers listed in the config file
async function queryServers() {
    var address;
    var hasWhitelistBot;
    var hasStatusBot;
    var response
    var displayText;

    var color;
    var channelid = config.getConfig()["DISCORD"]["STATUS"];
    var image = config.getConfig()["DISCORD"]["STATUS_IMAGE"];

    for (var i = 0; i < Object.keys(config.getConfig()["SERVERS"]).length; i++) {
        var server = config.getConfig()["SERVERS"]["SERVER_" + (i + 1)];
        address = server["ADDRESS"];
        hasWhitelistBot = server["WHITELIST_BOT"];
        hasStatusBot = server["STATUS_BOT"];
        messageId = server["MESSAGE_ID"];

        logger.logInformation("[GENERAL] Query for server #" + (i + 1));

        try {
            //Get steam server information
            response = await steam.queryGameServerInfo(address);
            if (hasWhitelistBot) {
                logger.logInformation("[VIP] Loading players for server #" + (i + 1));
                handlePlayers(server["RCON"]);
            }
            if (hasStatusBot) {
                displayText = "Current map: " + response["map"] + "\r\n Players: " + response["players"] + "/" + response["maxPlayers"] + "\r\n Public: " + (response["visibility"] ? "No" : "Yes");
                displayText = displayText + "\r\n" + await getPublicInfo(server["PUBLIC_STATS"]);
                color = config.getConfig()["DISCORD"]["COLOR_SUCCESS"];
                api.displayServer(response["name"], color, "Last check: " + time.getToday(), displayText, image, "empty", channelid, i);
            }
        } catch (e) {
            logger.logError("[GENERAL] Unable to load server #" + (i + 1) + " :" + e);
            if (hasStatusBot) {
                color = config.getConfig()["DISCORD"]["COLOR_ERROR"];
                api.displayServer(server["SERVERNAME"], color, "Last check: " + time.getToday(), "The server is currently offline", displayText, image, "empty", channelid, i);
            }
        }
    }
}

async function handlePlayers(urlConfig) {
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
    var key;

    for (var i = 0; i < rconPlayers.length; i++) {
        playerExists = false;
        isTagged = false;
        //Get userdata from rcontool
        userdata = await rcon.getUserdata(urlConfig, cookies, rconPlayers[i]);

        if (userdata) {
            userdata = userdata.data["result"];
        }

        if (userdata == null) continue;

        //Update players -> VIP check, Playtime update
        for (var j = 0; j < players.length; j++) {
            if (players[j].steamid == rconPlayers[i]) {
                playerExists = true;
                if (!players[j].hasDonated && !players[j].hasTag) {
                    players[j].updatePlaytime(time.getHoursFromSeconds(userdata["total_playtime_seconds"]));
                    players[j].hasVIP();
                }
                break;
            }
        }
        username = (await api.getUsername(userdata["steam_id_64"]))["data"]["data"];
        //Check if player has excluded nameparts
        for (var j = 0; j < config.getConfig()["VIP_BOT"]["EXCLUDED"].length; j++) {
            key = config.getConfig()["VIP_BOT"]["EXCLUDED"][j];
            if (username.includes(key)) {
                isTagged = true;
                break;
            }
        }
        if (!playerExists) {
            players.push(new Player(userdata["steam_id_64"], time.getHoursFromSeconds(userdata["total_playtime_seconds"]), 0, time.getUnix(), -1, false, isTagged));
        }
        else{
            for (var j = 0; j < players.length; j++) {
                if (players[j].steamid == rconPlayers[i]) {
                    players[j].hasTag = isTagged;
                    break;
                }
            }
        }
    }
    rcon.logoutRCON(urlConfig + "api/logout", cookies);
}

async function getPublicInfo(url) {
    var result = "";
    if (url != "none") {
        logger.logInformation("[STATUS] Getting public stats from: " + url);
        var response = await axios(url);
        var start = response.data["result"]["current_map"]["start"];
        var nextMap = response.data["result"]["next_map"];
        var playtimeSeconds = time.getUnix() - start;
        var playtimeMinutes = Math.floor(playtimeSeconds / 60)
        playtimeSeconds = Math.floor(playtimeSeconds % 60);
        if (playtimeMinutes.toString().length < 2) {
            if (playtimeMinutes < 10) {
                playtimeMinutes = "0" + playtimeMinutes;
            }
            else {
                playtimeMinutes = playtimeMinutes + "0";
            }
        }
        if (playtimeSeconds.toString().length < 2) {
            if (playtimeSeconds < 10) {
                playtimeSeconds = "0" + playtimeSeconds;
            }
            else {
                playtimeSeconds = playtimeSeconds + "0";
            }
        }

        if (playtimeMinutes > 95) {
            result = "Time played: Not started \r\n";
        }
        else {
            result = "Time played: " + playtimeMinutes + ":" + playtimeSeconds + "\r\n";
        }

        result = result + "Next map: " + nextMap;
    }
    return result;
}

async function savePlayers() {
    logger.logInformation("[VIP] Saving players to database");
    players.forEach(player => {
        database.savePlayer(player);
    });
    isSaved = false;
}

async function handleMessages() {
    if (messages == null) return;
    var steamid;
    var username;
    var player;
    var message = "";
    var color = config.getConfig()["DISCORD"]["COLOR_NEUTRAL"];
    for (var i = 0; i < messages.length; i++) {
        steamid = messages[i].split("/")[1];
        player = null;
        for (var j = 0; j < players.length; j++) {
            if (players[j].steamid == steamid) {
                player = players[j];
                break;
            }
        }
        // Player is not in our database
        if (player == null) {
            message = config.getConfig()["VIP_BOT"]["MESSAGE_INVALID"];
            color = config.getConfig()["DISCORD"]["COLOR_ERROR"];
        }
        else {
            username = (await api.getUsername(steamid)).data["data"];
            // Player is exluded
            if (player.hasTag) {
                message = config.getConfig()["VIP_BOT"]["MESSAGE_EXCLUDED"];
                color = config.getConfig()["DISCORD"]["COLOR_NEUTRAL"];
            }
            // Player has donated
            else if (player.hasDonated) {
                message = config.getConfig()["VIP_BOT"]["MESSAGE_DONATED"];
                color = config.getConfig()["DISCORD"]["COLOR_NEUTRAL"];
            }
            // Player is already VIP
            else if (player.unix_vip > 0) {
                message = config.getConfig()["VIP_BOT"]["MESSAGE_ALREADY_VIP"]
                color = config.getConfig()["DISCORD"]["COLOR_NEUTRAL"];
                message = message + "\r\nTime left: " + ((config.getConfig()["VIP_BOT"]["VIP_AMOUNT"] - time.getDaysFromSeconds(time.getUnix() - player.unix_vip))).toFixed(1) + "/" + config.getConfig()["VIP_BOT"]["VIP_AMOUNT"] + " days";
            }
            else {
                // Player should be VIP, send Message to admins
                if (player.unix_vip == 0) {
                    message = config.getConfig()["VIP_BOT"]["MESSAGE_GIVE_VIP"];
                    for (var j = 0; j < players.length; j++) {
                        if (players[j] == player) {
                            players[j].unix_vip = time.getUnix();
                            break;
                        }
                    }
                    color = config.getConfig()["DISCORD"]["COLOR_SUCCESS"];
                    api.sendMessage("VIP check", config.getConfig()["DISCORD"]["COLOR_SUCCESS"], steamid, config.getConfig()["VIP_BOT"]["MESSAGE_GIVE_ADMIN"], null, "<@&" + config.getConfig()["DISCORD"]["ROLE_PING"] + ">", config.getConfig()["DISCORD"]["VIP_ADMIN"], 0);
                }
                // Player doesn't have enough hours
                else {
                    message = config.getConfig()["VIP_BOT"]["MESSAGE_DENY_VIP"];
                    message = message + "\r\nTime left: " + ((config.getConfig()["VIP_BOT"]["TIME_TO_PLAY"] - time.getDaysFromSeconds(time.getUnix() - player.unix_playtime))).toFixed(1) + "/" + config.getConfig()["VIP_BOT"]["TIME_TO_PLAY"] + " days";
                    message = message + "\r\nTime played: " + player.playtime.toFixed(1) + "/" + config.getConfig()["VIP_BOT"]["HOURS_TO_REACH"];
                    color = config.getConfig()["DISCORD"]["COLOR_ERROR"];
                }

            }
        }
        api.sendMessage("VIP check", color, username + "/" + steamid, message, config.getConfig()["DISCORD"]["VIP_IMAGE"], "empty", config.getConfig()["DISCORD"]["VIP_PUBLIC"], messages[i].split("/")[0]);
    }
}

async function run() {
    database.openConnection();
    logger.setLogLevel();
    logger.logInformation("[GENERAL] Preparing database and loading players");
    var playerArray = await database.loadPlayers();
    var player;
    for (var i = 0; i < playerArray.length; i++) {
        player = playerArray[i];
        players.push(new Player(player["steamid"], player["playtimeTotal"], player["playtime"], player["unix_playtime"], player["unix_vip"], player["hasDonated"], player["hasTag"]));
    }
    while (true) {
        database.openConnection();
        logger.logInformation("[VIP] Getting discord messages");
        messages = (await api.getMessages()).data["data"];
        handleMessages();
        logger.logInformation("[GENERAL] Starting server query");
        await queryServers();
        logger.logInformation("[GENERAL] Waiting " + config.getConfig()["REFRESH_TIME"] + " seconds until next query");
        logger.sendToDiscord();
        await new Promise(r => setTimeout(r, config.getConfig()["REFRESH_TIME"] * 1000));
        if (!isSaved) {
            setTimeout(function () { savePlayers(); }, config.getConfig()["REFRESH_TIME"] * 5000);
            isSaved = true;
        }
    }
}

run();