async function formatCookies(response){
    if(response){
        response = response["headers"]["set-cookie"][0].split(';')[0] + "; " + response["headers"]["set-cookie"][1].split(';')[0];
    }
    return response;
}

async function formatRCONPlayers(response){
    var rconPlayers = Array();
    if(response){
        response = response.data["result"]["stats"].forEach(player => {
            rconPlayers.push(player["steam_id_64"]);
        });
    }
    return rconPlayers;
}

module.exports = {formatCookies, formatRCONPlayers}