require('dotenv').config();

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const logger = require('./logger');
const response = require("./responseHandler");

function getRCONPlayers(url, cookies){
    var data = "";

    var config = {
        method: 'get',
        url: url + "/api/live_scoreboard",
        headers: { 
            'Content-Type': 'application/json',
            'Cookie': cookies
        },
        data : data
    };

    return axios(config).catch(function (error) {
        logger.logError("[WHITELIST] Unable to receive players from RCON tool at " + url);
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
        .catch(function (error) {
            logger.logError("[GENERAL] Unable to disconnect from RCON tool at " + url);
        });
}

function loginRCON(url){
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

    return axios(config).catch(function (error) {
        logger.logError("[GENERAL] Unable to connect to RCON tool at " + url);
    });
}

function getVIPs(url, cookies){
    var data = "";

    var config = {
        method: 'get',
        url: url + "/api/download_vips",
        headers: { 
            'Content-Type': 'application/json',
            'Cookie': cookies
        },
        data : data
    };

    return axios(config);
}

function getUserdata(url, cookies, steamid){
    var data = JSON.stringify({
        "steam_id_64": steamid,
    });
    
    var config = {
        method: 'get',
        url: url + "/api/player",
        headers: { 
            'Content-Type': 'application/json',
            'Cookie': cookies
        },
        data : data
    };

    return axios(config).catch(function (error) {
            logger.logError("[WHITELIST] Unable to receive playerdata from RCON tool for player " + steamid);
    });
}

module.exports = {getRCONPlayers, logoutRCON, loginRCON, getVIPs, getUserdata};