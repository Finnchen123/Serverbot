require('dotenv').config();

const { Worker } = require('worker_threads');

const logger = require('./logger');
const config = require('./configLoader');

async function run() {
    logger.setLogLevel();

    logger.logInformation("[GENERAL] Preparing workers for bot parts");
    var workerStatus = new Worker("./statusbot.js");
    var workerVIP = new Worker("./vipbot.js");

    workerStatus.postMessage("run");
    workerVIP.postMessage("run");

    while (true){
        await new Promise(r => setTimeout(r, config.getConfig()["REFRESH_TIME"] * 2000));
        logger.sendToDiscord();
    }
}

run();