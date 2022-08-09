const steam = require("steam-server-query");
const axios = require('axios');
const { parentPort } = require('worker_threads');

const logger = require('./logger');
const config = require('./configLoader');
const time = require('./timeFormatter');
const api = require("./APIHandler");

parentPort.once('message', (message) => {
    run();
});

async function run() {
    while(true){
        queryServers();
        await new Promise(r => setTimeout(r, config.getConfig()["REFRESH_TIME"] * 1000));
    }
}

async function queryServers() {
    var address;
    var hasStatusBot;
    var displayText;

    var color;
    var channelid = config.getConfig()["DISCORD"]["STATUS"];
    var image = config.getConfig()["DISCORD"]["STATUS_IMAGE"];

    for (var i = 0; i < Object.keys(config.getConfig()["SERVERS"]).length; i++) {
        var server = config.getConfig()["SERVERS"]["SERVER_" + (i + 1)];
        hasStatusBot = server["STATUS_BOT"];
        if (!hasStatusBot) continue;
        address = server["ADDRESS"];
        messageId = server["MESSAGE_ID"];

        logger.logInformation("[GENERAL] Query for server #" + (i + 1));

        await steam.queryGameServerInfo(address).then(response => {
            displayText = "Current map: " + response["map"] + "\r\n Players: " + response["players"] + "/" + response["maxPlayers"] + "\r\n Public: " + (response["visibility"] ? "No" : "Yes");
            getPublicInfo(server["PUBLIC_STATS"]).then(response => {
                displayText = displayText + "\r\n" + response;
                api.displayServer(response["name"], color, "Last check: " + time.getToday(), displayText, image, "empty", channelid, i).catch(error => {
                    logger.logError("[DISCORD] Unable to update server status for server #" + i)
                });
            }).catch(error => {
                logger.logWarning("[RCON] Unable to load public stats for server #" + i)
                api.displayServer(response["name"], color, "Last check: " + time.getToday(), displayText, image, "empty", channelid, i).catch(error => {
                    logger.logError("[DISCORD] Unable to update server status for server #" + i)
                });
            })
            color = config.getConfig()["DISCORD"]["COLOR_SUCCESS"];
        }).catch(error => {
            logger.logWarning("[STEAM] Unable to load server data for server #" + i)
            color = config.getConfig()["DISCORD"]["COLOR_ERROR"];
            api.displayServer(server["SERVERNAME"], color, "Last check: " + time.getToday(), "The server is currently offline", displayText, image, "empty", channelid, i).catch(error => {
                logger.logError("[DISCORD] Unable to update server status for server #" + i)
            });
        });
    }
}

async function getPublicInfo(url) {
    var result = "";
    if (url != "none") {
        logger.logInformation("[RCON] Getting public stats from: " + url);
        axios(url).then(response => {
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
        }).catch(error => {
            logger.logWarning("[RCON] Unable to load public information " + error);
        });
    }
    return result;
}