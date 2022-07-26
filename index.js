require('dotenv').config();

const { Worker } = require('worker_threads');

const logger = require('./logger');

async function run() {
    logger.logInformation("[GENERAL] Preparing workers for bot parts");
    var workerStatus = new Worker("./statusbot.js");
    var workerVIP = new Worker("./vipbot.js");

    workerStatus.postMessage("run");
    workerVIP.postMessage("run");
}

run();