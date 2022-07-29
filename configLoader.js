const yaml = require('js-yaml');
const fs = require('fs');

const configPath = './config.yml';
var config;

function loadConfig(){
    try {
        config = yaml.load(fs.readFileSync(configPath, 'utf8'));
        fs.close(configPath);
    } catch (e) {
        logger.logError("[GENERAL] Unable to load config file. Please contact your system administrator");
    }
}

function getConfig(){
    loadConfig();
    return config;
}

module.exports = {loadConfig, getConfig}