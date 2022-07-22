class Player{
    constructor(username, steamid, playtimeTotal, playtime, timestamp_playtime, hasVIP, timestamp_vip, hasDonated, timestamp_donation){
        this.username = username;
        this.steamid = steamid;
        this.playtimeTotal = playtimeTotal;
        this.playtime = playtime;
        this.timestamp_playtime = timestamp_playtime;
        this.hasVIP = hasVIP;
        this.timestamp_vip = timestamp_vip;
        this.hasDonated = hasDonated;
        this.timestamp_donation = timestamp_donation;
    }

    isClanMember(keywords){
        for(var i = 0; i < keywords.length; i++){
            if(this.username.search(keywords[i])){
                return true;
            }
        }
        return false;
    }

    shouldGiveVIP(daysMax){
        var seconds = (Date.now() / 1000) - this.timestamp_playtime;
        var days = seconds / (60 * 60 * 24);
        if(days >= daysMax){
            return true;
        }
        return false;
    }

    shouldRemoveVIP(daysMax){
        if(!this.hasDonated){
            var seconds = (Date.now() / 1000) - this.timestamp_vip;
            var days = seconds / (60 * 60 * 24);
            if(days >= daysMax){
                return true;
            }
        }
        return false;
    }
}

function loadPlayers(){

}

function createDatabase(){

}

module.exports = {loadPlayers, createDatabase, Player}