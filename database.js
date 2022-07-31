require('dotenv').config();

const mysql = require('mysql');

const logger = require('./logger');

const config = {
    host: '192.168.1.48',
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: 'whitelist'
};

var connection;

//steamid, playtimeTotal, playtime, unix_playtime, unix_vip, hasDonated, hasTag
function loadPlayers() {
    return new Promise(function (resolve, reject) {
        try {
            if(!connection){
                openConnection();
            }
            connection.query(
                'SELECT * FROM players',
                [],
                (error, results) => {
                    if (error) {
                        return reject(error);
                    } else {
                        resolve(results);
                    }
                }
            );
        } catch (err) {
            return reject("Unable to connect to database");
        }
    })
}

function savePlayer(player) {
    try {
        if(!connection){
            openConnection();
        }
        connection.query(
            'INSERT INTO players (steamid, playtimeTotal, playtime, unix_playtime, unix_vip, hasDonated, isExcluded) VALUES (?,?,?,?,?,?,?) ' + 
            'ON DUPLICATE KEY UPDATE playtimeTotal=?, playtime=?, unix_playtime=?, unix_vip=?, hasDonated=?, isExcluded=?;',
            [
                player.steamid, player.playtimeTotal, player.playtime, player.unix_playtime, player.unix_vip, player.hasDonated, player.hasTag,
                player.playtimeTotal, player.playtime, player.unix_playtime, player.unix_vip, player.hasDonated, player.hasTag
            ],
            (error, results) => {
                if (error) {
                    logger.logError("[GENERAL] Unable to save player " + error);
                }
            }
        );
    } catch (err) {
        logger.logError("[GENERAL] Unable to connect to database");
    }
}

function openConnection(){
    if(!connection){
        connection = mysql.createConnection(config);
    }
    if(connection.state == "disconnected"){
        connection.connect(function (err) {
            if (err) {
                logger.logWarning(err);
            }
        });
    }
}

function closeConnection(){
    if (connection) {
        connection.end();
    }
}

module.exports = { loadPlayers, savePlayer, openConnection, closeConnection }