require('dotenv').config();

const axios = require('axios');
const md5 = require('md5');

const config = require('./configLoader');

const url = "https://nicolasovic.ch/api/";
const pw = md5(process.env.BOT_PASSWORD);
const username = process.env.BOT_USERNAME;
const serverid = config.getConfig()["DISCORD"]["SERVERID"];

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
        headers: { 
            'Content-Type': 'application/json',
        },
        data : data
    };

    return axios(config);
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
        headers: { 
            'Content-Type': 'application/json',
        },
        data : data
    };

    return axios(config);
}

function getUsername(steamid){
    var data = JSON.stringify({
        "username": username,
        "password": pw
    });

    var config = {
        method: 'get',
        url: url + "getUsername/" + steamid,
        headers: { 
            'Content-Type': 'application/json',
        },
        data : data
    };

    return axios(config);
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
        headers: { 
            'Content-Type': 'application/json',
        },
        data : data
    };

    return axios(config);
}

module.exports = {sendMessage, removeMessages, getUsername, getMessages}