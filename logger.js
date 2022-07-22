function logInformation(message) {
    console.log("INFO: " + message);
}

function logWarning(message) {
    console.warn("WARN: " + message);
}

function logError(message) {
    console.error("ERROR: " + message);   
}

module.exports = {logInformation, logWarning, logError};
