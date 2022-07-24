var messages = Array();

function logInformation(message) {
    console.log("INFO: " + message);
}

function logWarning(message) {
    console.warn("WARN: " + message);
}

function logError(message) {
    console.error("ERROR: " + message);
}

function logVIP(message){
    console.log("VIP: " + message);
    messages.push("VIP: " + message);
}

function sendToDiscord(discord){
    messages.forEach(message => {
        discord.sendLog(message);
    })
    messages = Array();
}

module.exports = {logInformation, logWarning, logError, sendToDiscord, logVIP};
