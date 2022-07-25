# Installation
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
# Starting the application
## Linux
Change into the directory if not already there: `cd Serverbot`  
Start the script: `./install.sh start`
## Windows
(WORK IN PROGRESS)
# Updates
If you want to update your application you have to save your config.yml file in a different directory,
update with the following command and replace the downloaded config.yml with your config file.
## Linux
Change into the directory if not already there: `cd Serverbot`  
Move the config.yml file: `mv config.yml /tmp/config.yml`  
Get the latest code: `git pull`  
Replace the downloaded config: `mv /tmp/config.yml config.yml`  
Make the install file executable: `chmod +x install.sh`  
## Windows
(WORK IN PROGRESS)