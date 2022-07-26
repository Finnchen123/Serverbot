require('dotenv').config();

const axios = require('axios');
const https = require('https')
const md5 = require('md5');

const config = require('./configLoader');

const url = "https://nicolasovic.ch/api/";
const pw = md5(process.env.BOT_PASSWORD);
const username = process.env.BOT_USERNAME;
const serverid = config.getConfig()["DISCORD"]["SERVERID"];

var servermessages = Array();

function sendMessage(title, colorid, name, message, image, content, channelid, messageid){
    var data = JSON.stringify({
        "username": username,
        "password": pw,
        "title": title,
        "name": name,
        "colorid": colorid,
        "message": message,
        "image": image,
        "content": content,
        "channelid": channelid,
        "serverid": serverid,
        "messageid": messageid
    });

    var config = {
        method: 'post',
        url: url + "sendMessage",
        httpsAgent: new https.Agent({ keepAlive: true }),
        headers: { 
            'Content-Type': 'application/json',
        },
        data : data
    };
    
    return axios(config).catch(function (error) {
        console.log("WARN: [DISCORD] Unable to send message to discord");
    });
}

async function displayServer(title, colorid, name, message, image, content, channelid, index){
    if(servermessages[index] != null){
        var data = JSON.stringify({
            "username": username,
            "password": pw,
            "title": title,
            "name": name,
            "colorid": colorid,
            "message": message,
            "image": image,
            "content": content,
            "channelid": channelid,
            "serverid": serverid,
            "messageid": servermessages[index]
        });
    
        var config = {
            method: 'post',
            url: url + "updateMessage",
            httpsAgent: new https.Agent({ keepAlive: true }),
            headers: { 
                'Content-Type': 'application/json',
            },
            data : data
        };
        return axios(config).catch(function (error) {
            console.log("WARN: [DISCORD] Unable to update server status");
        });
    }
    else{
        try{
            var message = await sendMessage(title, colorid, name, message, image, content, channelid, 0);
            if(message){
                servermessages[index] = message["data"]["data"];
            }
        }catch(e){
            console.log("WARN: [STATUS] Unable to send server status " + e);
        }
    }
}

function removeMessages(amount, channelid){
    var data = JSON.stringify({
        "username": username,
        "password": pw,
        "amount": amount,
        "channelid": channelid,
        "serverid": serverid
    });

    var config = {
        method: 'delete',
        url: url + "removeMessages",
        httpsAgent: new https.Agent({ keepAlive: true }),
        headers: { 
            'Content-Type': 'application/json',
        },
        data : data
    };

    return axios(config).catch(function (error) {
        console.log("WARN: [DISCORD] Unable to remove messages");
    });
}

function getUsername(steamid){
    var data = JSON.stringify({
        "username": username,
        "password": pw
    });

    var config = {
        method: 'get',
        url: url + "getUsername/" + steamid,
        httpsAgent: new https.Agent({ keepAlive: true }),
        headers: { 
            'Content-Type': 'application/json',
        },
        data : data
    };

    return axios(config).catch(function (error) {
        console.log("WARN: [DISCORD] Unable to get username");
    });
}

function getMessages(){
    var data = JSON.stringify({
        "username": username,
        "password": pw,
        "serverid": serverid
    });

    var config = {
        method: 'get',
        url: url + "getMessages",
        httpsAgent: new https.Agent({ keepAlive: true }),
        headers: { 
            'Content-Type': 'application/json',
        },
        data : data
    };

    return axios(config).catch(function (error) {
        console.log("WARN: [DISCORD] Unable to receive messages");
    });
}

module.exports = {sendMessage, removeMessages, getUsername, getMessages, displayServer}