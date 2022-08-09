const steam = require("steam-server-query");
const axios = require('axios');
const { parentPort } = require('worker_threads');

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

parentPort.once('message', (message) => {
    run();
});

async function run() {
    var playerArray = await database.loadPlayers();
    var player;
    for (var i = 0; i < playerArray.length; i++) {
        player = playerArray[i];
        players.push(new Player(player["steamid"], player["playtimeTotal"], player["playtime"], player["unix_playtime"], player["unix_vip"], player["hasDonated"], player["hasTag"]));
    }
    while (true) {
        for (var i = 0; i < Object.keys(config.getConfig()["SERVERS"]).length; i++) {
            var server = config.getConfig()["SERVERS"]["SERVER_" + (i + 1)];
            if (server["WHITELIST_BOT"]) {
                logger.logInformation("[VIP] Loading players for server #" + (i + 1));
                handlePlayers(server["RCON"]);
            }
        }
        messages = (await api.getMessages())["data"]["data"];
        handleMessages();
        if (!isSaved) {
            setTimeout(function () { savePlayers(); }, config.getConfig()["REFRESH_TIME"] * 5000);
            isSaved = true;
        }
        await new Promise(r => setTimeout(r, config.getConfig()["REFRESH_TIME"] * 1000));
    }
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
            username = "";
            await api.getUsername(steamid).then(response => {
                username = response["data"]["data"];
            }).catch(error => {
                logger.logWarning("[API] Unable to retrieve username for " + steamid);
            });
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
                message = message.replace("%d", ((config.getConfig()["VIP_BOT"]["VIP_AMOUNT"] - time.getDaysFromSeconds(time.getUnix() - player.unix_vip))).toFixed(1))
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
                    api.sendMessage("VIP check", config.getConfig()["DISCORD"]["COLOR_SUCCESS"], steamid, config.getConfig()["VIP_BOT"]["MESSAGE_GIVE_ADMIN"], null, "<@&" + config.getConfig()["DISCORD"]["ROLE_PING"] + ">", config.getConfig()["DISCORD"]["VIP_ADMIN"], 0)
                        .catch(error => {
                            logger.logWarning("[VIP] Unable to send admin message")
                        });
                }
                // Player doesn't have enough hours
                else {
                    message = config.getConfig()["VIP_BOT"]["MESSAGE_DENY_VIP"];
                    message = message.replace("%d", config.getConfig()["VIP_BOT"]["TIME_TO_PLAY"]);
                    message = message.replace("%h1", player.playtime.toFixed(1));
                    message = message.replace("%h2", config.getConfig()["VIP_BOT"]["HOURS_TO_REACH"]);
                    color = config.getConfig()["DISCORD"]["COLOR_ERROR"];
                }
            }
        }
        api.sendMessage("VIP ANFRAGE", color, "Hallo " + username, message, config.getConfig()["DISCORD"]["VIP_IMAGE"], "empty", config.getConfig()["DISCORD"]["VIP_PUBLIC"], messages[i].split("/")[0])
            .catch(error => {
                logger.logError("[VIP] Unable to answer user " + steamid)
            });
    }
}

async function savePlayers() {
    logger.logInformation("[VIP] Saving players to database");
    players.forEach(player => {
        try {
            database.savePlayer(player);
        }
        catch (e) {
            logger.logError("[VIP] Unable to save players to database " + e);
        }
    });
    isSaved = false;
}

async function handlePlayers(urlConfig) {
    //Login
    try {
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
                userdata = userdata["data"]["result"];
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
            try {
                username = (await api.getUsername(userdata["steam_id_64"]))["data"]["data"];
                //Check if player has excluded nameparts
                for (var j = 0; j < config.getConfig()["VIP_BOT"]["EXCLUDED"].length; j++) {
                    key = config.getConfig()["VIP_BOT"]["EXCLUDED"][j];
                    if (username.includes(key)) {
                        isTagged = true;
                        break;
                    }
                }
            } catch (ex) {
                logger.logWarning("[VIP] Unable to load username for " + userdata["steam_id_64"]);
            }

            if (!playerExists) {
                players.push(new Player(userdata["steam_id_64"], time.getHoursFromSeconds(userdata["total_playtime_seconds"]), 0, time.getUnix(), -1, false, isTagged));
            }
            else {
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
    catch (e) {
        logger.logError("[VIP] Unable to load and update players " + e);
    }
}