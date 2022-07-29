const config = require('./configLoader');

function getToday(){
    var dateFormat = config.getConfig()["DATE_FORMAT"];
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

    switch(dateFormat){
        case 1:
            today = dd + '/' + mm + '/' + yyyy + " - " + hours + ":" + minutes + ":" + seconds;
            break;
        case 2:
            today = mm + '/' + dd + '/' + yyyy + " - " + hours + ":" + minutes + ":" + seconds;
            break;
        case 3:
            today = dd + '-' + mm + '-' + yyyy + "   " + hours + ":" + minutes + ":" + seconds;
            break;
        case 4:
            today = mm + '-' + dd + '-' + yyyy + "   " + hours + ":" + minutes + ":" + seconds;
            break;
        default:
            today = dd + '.' + mm + '.' + yyyy + " - " + hours + ":" + minutes + ":" + seconds;
            break;
    }
    
    return today;
}

function getSecondsFromMilliseconds(ms){
    return ms / 1000;
}

function getMinutesFromMilliseconds(ms){
    return getMinutesFromMilliseconds(ms) / 60;
}

function getHoursFromMilliseconds(ms){
    return getMinutesFromMilliseconds(ms) / 60;
}

function getDaysFromMilliseconds(ms){
    return getHoursFromMilliseconds(ms) / 24;
}

function getHoursFromSeconds(s){
    return getHoursFromMilliseconds(s * 1000);
}

module.exports = {getToday, getSecondsFromMilliseconds, getMinutesFromMilliseconds, getHoursFromMilliseconds, getDaysFromMilliseconds, getHoursFromSeconds}