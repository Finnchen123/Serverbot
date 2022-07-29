const fs = require("fs");

const config = require('./configLoader');
const api = require('./APIHandler');

var messages = Array();
var logfile = "log.txt";
var loglevelDiscord = 0;
var loglevelFile = 0;

function setLogLevel(){
    loglevelDiscord = config.getConfig()["LOGLEVEL_DISCORD"];
    loglevelFile = config.getConfig()["LOGLEVEL_FILE"];
}

function logInformation(message) {
    console.log("INFO: " + message);
    if(loglevelDiscord <= 0){
        messages.push("INFO: " + message);
    }
    if(loglevelFile <= 0){
        fs.appendFile(logfile, "INFO: " + message + "\r\n", (err) =>{
            if(err){
                console.log("ERROR: Couldn't write to file " + err);
            }
        });
    }
}

function logWarning(message) {
    console.warn("WARN: " + message);
    if(loglevelDiscord <= 1){
        messages.push("WARN: " + message);
    }
    if(loglevelFile <= 1){
        fs.appendFile(logfile, "WARN: " + message + "\r\n", (err) =>{
            if(err){
                console.log("ERROR: Couldn't write to file" + err);
            }
        });
    }
}

function logError(message) {
    console.error("ERROR: " + message);
    if(loglevelDiscord <= 2){
        messages.push("ERROR: " + message);
    }
    if(loglevelFile <= 2){
        fs.appendFile(logfile, "ERROR: " + message + "\r\n", (err) =>{
            if(err){
                console.log("ERROR: Couldn't write to file " + err);
            }
        });
    }
}

function logVIP(message){
    console.log("VIP: " + message);
    if(loglevelDiscord <= 3){
        messages.push("VIP: " + message);
    }
    if(loglevelFile <= 3){
        fs.appendFile(logfile, "VIP: " + message + "\r\n", (err) =>{
            if(err){
                console.log("ERROR: Couldn't write to file" + err);
            }
        });
    }
}

function sendToDiscord(){
    messages.forEach(message => {
        api.sendMessage("Serverbot log VIP", config.getConfig()["DISCORD"]["COLOR_NEUTRAL"], "VIP check", message, " ", config.getConfig()["DISCORD"]["ROLE_PING"], config.getConfig()["DISCORD"]["VIP_ADMIN"])
    })
    messages = Array();
}

module.exports = {logInformation, logWarning, logError, sendToDiscord, logVIP, setLogLevel};
