const steam = require("steam-server-query");
const yaml = require('js-yaml');
const fs = require('fs');
const logger = require('./logger');

var isRunning = true;
var config;

async function queryServers(){
    var ip;
    var port;

    for(var i = 1; i <= config["WHITELIST_BOT"]["SERVERCOUNT"]; i++){
        ip = config["WHITELIST_BOT"]["SERVERS"]["SERVER_"+i]["IP"];
        port = config["WHITELIST_BOT"]["SERVERS"]["SERVER_"+i]["PORT"];
        var response = await steam.queryGameServerInfo(ip + ":" + port);
        if(response != null){
            getPlayers(ip + ":" + port);
        }
    }
}

function getPlayers(server){
    steam.queryGameServerPlayer(server).then(playerResponse => {
        console.log(server + "\r\n" + JSON.stringify(playerResponse));
    }).catch((err) => {
        console.error(err);
    });
}

function wait(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run(){
    while(isRunning){
        if(config == null){
            try {
                config = yaml.load(fs.readFileSync('./config.yml', 'utf8'));
                logger.logInformation("Loaded configuration");
            } catch (e) {
                logger.logError("Unable to load config file. Please contact system administrator");
                break;
            }
        }
        queryServers();
        break;
        if(!isRunning){
            break;
        }
        await wait(config["REFRESH_TIME"]);
    }
}

run();