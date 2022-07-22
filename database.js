require('dotenv').config();

const mysql = require('mysql');

const logger = require('./logger');

const config = {
    host     : '192.168.1.48',
    user     :  process.env.DB_USERNAME,
    password :  process.env.DB_PASSWORD,
    database : 'whitelist'
};

//username, steamid, playtimeTotal, playtime, unix_playtime, hasVIP, unix_vip, hasDonated, unix_donation
async function loadPlayers(){
    var players = Array();
    let conn;
    try{
        connection = mysql.createConnection(config);
        connection.connect(function(err) {
            if(err) {
                logger.logWarning(err);
            }
        });
        connection.query(
            'SELECT * FROM players',
			[],
			(error, results) => {
				if (error) {
                    logger.logWarning("Unable to load players");
				} else {
                    players = JSON.parse(results);
				}
			}
        );
    } catch(err){
        console.log(err);
    } finally {
        if (conn) return conn.end();
    }
    return players;
}

module.exports = {loadPlayers}