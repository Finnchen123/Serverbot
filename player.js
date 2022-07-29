const time = require("./timeFormatter");
const config = require('./configLoader');

class Player{
    //steamid, playtimeTotal, playtime, unix_playtime, unix_vip, hasDonated, isExcluded
    constructor(steamid, playtimeTotal, playtime, unix_playtime, unix_vip, hasDonated, hasTag){
        this.steamid = steamid;
        this.playtimeTotal = playtimeTotal;
        this.playtime = playtime;
        this.unix_playtime  = unix_playtime;
        this.unix_vip = unix_vip;
        this.hasDonated = hasDonated;
        this.hasTag = hasTag;
    }

    updatePlaytime(playtimeTotal){
        this.playtime = this.playtime + (playtimeTotal - this.playtimeTotal);
        this.playtimeTotal = playtimeTotal;
    }

    hasVIP(){
        var today = new Date();
        var isVip = (this.unix_vip != 0) ? true : false;
        var timePassed = today - this.unix_vip;
        //Check if player has reached max VIP time
        if(time.getDaysFromMilliseconds(timePassed) >= config.getConfig()["WHITELIST_BOT"]["VIP_AMOUNT"]){
            isVip = false;
            this.unix_vip = 0;
        }
        //Check if player has enough playtime to get VIP
        if(this.playtime >= config.getConfig()["WHITELIST_BOT"]["HOURS_TO_REACH"]){
            isVip = true;
            this.unix_vip = today;
        }
        //Check if player has time left to reach playtime
        var timePassed = today - this.unix_playtime;
        if(time.getDaysFromMilliseconds(timePassed) >= config.getConfig()["WHITELIST_BOT"]["TIME_TO_PLAY"]){
            this.unix_playtime = today;
            this.playtime = 0;
        }
        return isVip;
    }
}

module.exports = Player;