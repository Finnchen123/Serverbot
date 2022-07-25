require('dotenv').config();

const mysql = require('mysql');

const logger = require('./logger');

const config = {
    host: 'localhost',
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: 'whitelist'
};

//steamid, playtimeTotal, playtime, unix_playtime, hasVIP, unix_vip, hasDonated, unix_donation
function loadPlayer(steamid) {
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
                'SELECT * FROM players where steamid = ?',
                [steamid],
                (error, results) => {
                    if (error) {
                        return reject("Unable to load player");
                    } else {
                        resolve(results[0]);
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

function loadSteamIDs() {
    return new Promise(function (resolve, reject) {
        var players = Array();
        var connection;
        try {
            connection = mysql.createConnection(config);
            connection.query(
                'SELECT steamid FROM players',
                [],
                (error, results) => {
                    if (error) {
                        return reject("Unable to load players");
                    } else {
                        results.forEach(row => {
                            players.push(row["steamid"]);
                        });
                        resolve(players);
                    }
                }
            );
        } catch (err) {
            return reject(err);//"Unable to connect to database");
        } finally {
            if (connection) {
                connection.end();
            }
        }
    })
}

function addPlayer(steamid, playtimeTotal, hasVIP, unix_vip, hasDonated, unix_donation, username) {
    return new Promise(function (resolve, reject) {
        var connection;
        try {
            connection = mysql.createConnection(config);
            connection.query(
                'INSERT INTO players (username, steamid, playtimeTotal, playtime, unix_playtime, hasVIP, unix_vip, hasDonated, unix_donation) VALUES (?,?,?,?,?,?,?,?,?)',
                [username, steamid, playtimeTotal, 0, (Date.now() / 1000), hasVIP, unix_vip, hasDonated, unix_donation],
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
    })
}

function updatePlayer(steamid, playtimeTotal, playtime, unixPlaytime, hasVIP, unixVIP, username) {
    var connection;
    try {
        connection = mysql.createConnection(config);
        connection.query(
            'UPDATE players SET username=?, playtimeTotal=?, playtime=?, unix_playtime=?, hasVIP=?, unix_vip=? WHERE steamid=?',
            [username, playtimeTotal, playtime, unixPlaytime, hasVIP, unixVIP, steamid],
            (error, results) => {
                if (error) {
                    logger.logError("[WHITELIST] " + error);
                }
            }
        );
    } catch (err) {
        logger.logError("[WHITELIST] Unable to connect to database");
    } finally {
        if (connection) {
            connection.end();
        }
    }
}

module.exports = { loadPlayer, loadSteamIDs, addPlayer, updatePlayer }