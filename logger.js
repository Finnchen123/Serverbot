const fs = require("fs");

var messages = Array();
var logfile = "log.txt";
var loglevelDiscord = 0;
var loglevelFile = 0;

function setLogLevel(dc, file){
    loglevelDiscord = dc;
    loglevelFile = file
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

function sendToDiscord(discord){
    messages.forEach(message => {
        discord.sendLog(message);
    })
    messages = Array();
}

module.exports = {logInformation, logWarning, logError, sendToDiscord, logVIP, setLogLevel};
