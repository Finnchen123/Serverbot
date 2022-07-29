require('dotenv').config();

const mysql = require('mysql');

const logger = require('./logger');

const config = {
    host: '162.168.1.48',
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: 'whitelist'
};

//steamid, playtimeTotal, playtime, unix_playtime, unix_vip, hasDonated, isExcluded
function loadPlayers() {
    return new Promise(function (resolve, reject) {
        var connection;
        try {
            connection = mysql.createConnection(config);
            connection.connect(function (err) {
                if (err) {
                    logger.logWarning(err);
                }
            });
            connection.query(
                'SELECT * FROM players',
                [steamid],
                (error, results) => {
                    if (error) {
                        return reject("Unable to load players");
                    } else {
                        resolve(results);
                    }
                }
            );
        } catch (err) {
            return reject("Unable to connect to database");
        } finally {
            if (connection) {
                connection.end();
            }
        }
    })
}

function savePlayer(player) {
    var connection;
    try {
        connection = mysql.createConnection(config);
        connection.query(
            'INSERT INTO players (steamid, playtimeTotal, playtime, unix_playtime, unix_vip, hasDonated, isExcluded) VALUES (?,?,?,?,?,?,?) ' + 
            'ON DUPLICATE KEY UPDATE playtimeTotal=?, playtime=?, unix_playtime=?, unix_vip=?, hasDonated=?, isExcluded=?;',
            [
                player.steamid, player.playtimeTotal, player.playtime, player.unix_playtime, player.unix_vip, player.hasDonated, player.isExcluded,
                player.playtimeTotal, player.playtime, player.unix_playtime, player.unix_vip, player.hasDonated, player.isExcluded
            ],
            (error, results) => {
                if (error) {
                    return reject("Unable to save player " + steamid + error);
                }
                else {
                    resolve();
                }
            }
        );
    } catch (err) {
        return reject("Unable to connect to database");
    } finally {
        if (connection) {
            connection.end();
        }
    }
}

module.exports = { loadPlayers, savePlayer }