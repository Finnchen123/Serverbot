require('dotenv').config();

const { Client, GatewayIntentBits, MessageReaction, User, Message, TextChannel } = require("discord.js");

const logger = require('./logger');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ], partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

function startBot(config) {
    client.once('ready', c => {
        logger.logInformation(`Discord-bot ready! Logged in as ${c.user.tag}`);
    });

    client.on('messageCreate', message => {
        if (message.author.bot) return;
        if (message.channel.id != config["WHITELIST_BOT"]["DC_CHANNEL_PUBLIC"]) return;
        if (message.content.length != 17) return;
        if (!(/^[0-9]+$/.test(message.content))) return;

        console.log(message.content);
    });

    client.on("error", error => {
        logger.logError("Discord bot not working properly: " + error);
    });

    return client.login(process.env.BOT_TOKEN);
}

async function displayServer(servername, displayText, color, image, channelid) {
    logger.logInformation("Updating discord message for: " + servername);
    const embed = {
        title: servername,
        color: color,
        fields: [
            {
                "name": "Last check: " + getToday(),
                "value": displayText,
                "inline": true
            }
        ],
        image: {
            url: image,
        },
    }
    client.channels.cache.get(channelid).send({ embeds: [embed] });
}

async function clearStatusChannel(channelid) {
    var channel = client.channels.cache.get(channelid);
    await channel.bulkDelete(100, true);
}

function getToday() {
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var yyyy = today.getFullYear();
    var hours = today.getHours();
    if (hours.toString().length < 2) {
        hours = "0" + hours;
    }
    var minutes = today.getMinutes();
    if (minutes.toString().length < 2) {
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        else {
            minutes = minutes + "0";
        }
    }
    var seconds = today.getSeconds();
    if (seconds.toString().length < 2) {
        if (seconds < 10) {
            seconds = "0" + seconds;
        }
        else {
            seconds = seconds + "0";
        }
    }

    today = dd + '.' + mm + '.' + yyyy + " - " + hours + ":" + minutes + ":" + seconds;

    return today;
}

module.exports = { startBot, displayServer, clearStatusChannel };