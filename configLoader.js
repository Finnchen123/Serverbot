const yaml = require('js-yaml');
const fs = require('fs');
const { exit } = require('process');

const configPath = "./config.yml";
var config;

function loadConfig(){
    try {
        config = yaml.load(fs.readFileSync(configPath, 'utf8'));
        return true;
    } catch (e) {
        console.log(e);
        console.log("ERROR: [GENERAL] Unable to load config file. Please contact your system administrator");
        return false;
    }
}

function getConfig(){
    if(config == null){
        loadConfig();
    }
    return config;
}

module.exports = {loadConfig, getConfig}