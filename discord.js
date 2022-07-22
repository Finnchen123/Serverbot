const { WebhookClient } = require('discord.js');
const logger = require('./logger');

var webhookClient;

function displayServer(servername, displayText, color, image, messageId){
    logger.logInformation("Updating discord message for: " + servername);
    const embed = {
        title: servername,
        color: color,
        fields: [
            {
                "name": "Last check: " + getToday(),
                "value": displayText,
                "inline": true
            }
        ],
        image: {
            url: image,
        },
    }

    webhookClient.editMessage(messageId, {
        content: "",
        embeds: [embed],
    });
}

function createWebhook(url){
    webhookClient = new WebhookClient({url: url});
}

function getToday(){
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();
    var hours = today.getHours();
    if(hours.toString().length < 2){
        hours = "0" + hours;
    }
    var minutes = today.getMinutes();
    if(minutes.toString().length < 2){
        if(minutes < 10){
            minutes = "0" + minutes;
        }
        else{
            minutes = minutes + "0";
        }
    }
    var seconds = today.getSeconds();
    if(seconds.toString().length < 2){
        if(seconds < 10){
            seconds = "0" + seconds;
        }
        else{
            seconds = seconds + "0";
        }
    }
    
    today = dd + '.' + mm + '.' + yyyy + " - " + hours + ":" + minutes + ":" + seconds;

    return today;
}

function prepareDiscord(index){
    webhookClient.send({
        content: 'Preparation for Server #' + index,
    });
}

function checkMessageIds(config){
    var result = true;
    var messageId;
    var hasStatusBot;
    for (var i = 1; i <= Object.keys(config["SERVERS"]).length; i++) {
        messageId = config["SERVERS"]["SERVER_" + i]["MESSAGE_ID"];
        hasStatusBot = config["SERVERS"]["SERVER_" + i]["STATUS_BOT"];
        if(messageId == 0 && hasStatusBot){
            prepareDiscord(i);
            result = false;
        }
    }
    return result;
}

module.exports = {displayServer, createWebhook, prepareDiscord, checkMessageIds};