# Installation
It is highly recommended to use `sudo` with every command.
## Linux
Install git if not already installed: `apt install git`  
Get the repository with: `git clone https://github.com/Finnchen123/Serverbot.git`  
Change into the directory: `cd Serverbot`  
Make the fileMode unimportant for git: `git config core.fileMode false`  
Make the install file executable: `chmod +x install.sh`  
Start the script: `./install.sh install`  
## Windows
(WORK IN PROGRESS)
## Dependencies
You need the following applications installed and setup to run this serverbot
- https://github.com/MarechJ/hll_rcon_tool  

Everything else will be installed with the install script.
# Starting the application
Before the start you should look into the config.yml file and enter a value for **everything**
## Linux
You have to request a login to the discord api: finnchennicola@gmail.com (title: Discord API, content: username)  
(You will receive a password in text from me. The password is saved with md5 and will also be transferred with md5. You just have to enter the credentials to the .env file)  
Change into the directory if not already there: `cd Serverbot`  
Edit the config.yml and .env file: `nano (or vim) config.yml`, `nano (or vim) .env`  
Start the script: `./install.sh start`
## Windows
(WORK IN PROGRESS)
# Updates
## Linux
Change into the directory if not already there: `cd Serverbot`  
Get the latest code: `git pull`  
Make the install file executable: `chmod +x install.sh`  
## Windows
(WORK IN PROGRESS)
# Miscellaneous
## Updating donators
Open mariadb: `mariadb`  
Open database: `use whitelist;`  
Remove donator: `Update table players set hasDonated=false where steamid='[STEAMID]'`  
Add donator: `Update table players set hasDonated=true where steamid='[STEAMID]'`  
