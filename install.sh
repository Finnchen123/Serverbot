#!/bin/bash

mode="install"

if [[ $# -eq 0 ]];
then
    echo "No mode entered, taking default: install"
else
    if [[ $1 == "start" ]];
    then
        mode="start"
        echo "Mode 'start' selected"
    elif [[ $1 == "install" ]] 
    then
        mode="install"
        echo "Mode 'install' selected"
    else
        mode="illegal"
        echo "Unsupported mode: " . $1
        exit 0
    fi
fi


#Check if mysql or mariadb exists
if [[ $(mysqld --version) ]];
then
    echo "DB system exists, skipping installation"
else
    echo "Installing mariadb"
    apt-get -qqy install mariadb-server
    mariadb -e "CREATE DATABASE whitelist;";
    mysql_secure_installation
    echo "Finished mariadb installation"
fi

#Create database if not already created
dbExists=$(mysqlshow whitelist)
if [[ $dbExists == *"Tables"* ]]
then
    echo "Database exists"
else
    echo "Database missing. Creating database whitelist"
    mariadb -e "CREATE DATABASE whitelist;";
fi

#Create table if not already created
if [[ $dbExists == *"players"* ]]
then
    echo "Table exists"
else
    echo "Table missing. Creating table players"
    mariadb -e "CREATE TABLE whitelist.players (username text, steamid int(20) not null unique, playtimeTotal double default 0.0, playtime double default 0.0, unix_playtime int, hasVIP bool, unix_vip int, hasDonated bool, unix_donation int);"
    mariadb -e "Alter table whitelist.players modify username text character set utf8mb4;"
    read -p "Database username: (default:whitelistbot)" username
    read -sp "Database password: " password
    if [ -z "$username" ]
    then
        username="whitelistbot"
    fi
    mariadb -e "Create user '$username'@'localhost' identified by '$password';"
    mariadb -e "grant all on whitelist.* to '$username'@'localhost' identified by '$password';"
    mariadb -e "flush priviliges;"
fi




#Check if node exists
if [[ $(node -v) ]];
then
    echo "Node exists, skipping installation"
else
    echo "Installing nvm"
    wget -qo - "https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh" | bash
    source ~/.bashrc
    echo "Installing node v16.14.2"
    nvm install "v16.14.2"
    echo "Installing npm latest stable"
    npm install -g npm@latest
    echo "Finished node installation"
fi

#Check if tmux exists
if [[ $(tmux info) ]];
then
    echo "tmux exists, skipping installation"
else
    echo "Installing tmux"
    apt-get -qqy install tmux
    echo "Finished tmux installation"
fi

#Reloading bash to enable installed commands
source ~/.bashrc

#Check for .env file and create if not in directory
if [ -f ".env" ];
then
    echo ".env exists, skipping creation"
else
    echo "Creating .env file"
    echo "DB_USERNAME=" >> .env
    echo "DB_PASSWORD=" >> .env
    echo "RCON_USERNAME=" >> .env
    echo "RCON_PASSWORD=" >> .env
    echo "BOT_TOKEN=" >> .env
    echo "Finished .env creation"
fi

#Install necessary packages from npm
echo "Installing necessary packages"
npm install

if [[ $mode == "start" ]];
then
    #Starting tmux session for the program
    echo "Starting tmux session for the program"
    tmux new-session -d -s WhitelistBot
    tmux send-keys -t WhitelistBot "node index.js" Enter
    echo "Finished program installation and startup. To connect to the console enter 'tmux attach -t WhitelistBot'"
fi

