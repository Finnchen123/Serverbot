require('dotenv').config();

const axios = require('axios');

const logger = require('./logger');


async function getRCONPlayers(url, cookies){
    var data = "";
    var result = Array();

    var config = {
        method: 'get',
        url: url + "/api/live_scoreboard",
        headers: { 
            'Content-Type': 'application/json',
            'Cookie': cookies
        },
        data : data
    };

    await axios(config)
        .then(function (response) {
            logger.logInformation("Got players from RCON tool at " + url);
            response.data["result"]["stats"].forEach(player => {
                result.push(player["player"] + "" + player["steam_id_64"]);
            });
        })
        .catch(function (error) {
            logger.logError("Unable to receive players from RCON tool at " + url);
        });
}

function logoutRCON(url, cookies){
    var data = "";

    var config = {
        method: 'post',
        url: url,
        headers: { 
            'Content-Type': 'application/json',
            'Cookie': cookies
        },
        data : data
    };

    axios(config)
        .then(function (response) {
            logger.logInformation("Disconnected from RCON tool at " + url);
        })
        .catch(function (error) {
            logger.logError("Unable to disconnect from RCON tool at " + url);
        });
}

async function loginRCON(url){
    var result = "";
    var data = JSON.stringify({
        "username": process.env.RCON_USERNAME,
        "password": process.env.RCON_PASSWORD
    });

    var config = {
        method: 'post',
        url: url,
        headers: { 
            'Content-Type': 'application/json',
        },
        data : data
    };

    await axios(config)
        .then(function (response) {
            logger.logInformation("Connected to RCON tool at " + url);
            result = response["headers"]["set-cookie"][0].split(';')[0] + "; " + response["headers"]["set-cookie"][1].split(';')[0];
        })
        .catch(function (error) {
            logger.logError("Unable to connect to RCON tool at " + url);
        });
    
    return result;
}

async function getVIPs(url, cookies){
    var data = "";
    var result = Array();

    var config = {
        method: 'get',
        url: url + "/api/download_vips",
        headers: { 
            'Content-Type': 'application/json',
            'Cookie': cookies
        },
        data : data
    };

    await axios(config)
        .then(function (response) {
            logger.logInformation("Got VIPs from RCON tool at " + url);
            response.data.split("\n").forEach(line => {
                result.push(line.slice(0,17));
            })
        })
        .catch(function (error) {
            logger.logError("Unable to receive VIPs from RCON tool at " + url);
        });
    
    return result;
}

module.exports = {getRCONPlayers, logoutRCON, loginRCON, getVIPs};