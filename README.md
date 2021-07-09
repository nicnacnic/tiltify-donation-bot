# tiltify-donation-bot
A bot that posts Tiltify donation data to Discord.

![image](https://user-images.githubusercontent.com/39160563/125010924-7d006b00-e035-11eb-9884-6364a79f8532.png)


## Hosted Version
This verion of the bot is meant to be self-hosted. To deploy the hosted version, invite the bot via this link: [https://discord.com/oauth2/authorize?client_id=815284001618395238&scope=bot](https://discord.com/oauth2/authorize?client_id=815284001618395238&scope=bot)

## Requirements
The user configuring the bot must have the manage messages or admin permission on the server to set up the bot. Be warned, once setup **anyone** can access the bot's commands (meaning they can add or delete campaigns), so it's recommended that this bot is given a special role with access to a protected channel.

## Installation
Create a discord bot. Then, install the bot to your computer/server as you normally would. In `config.json`, copy/paste your bot token from Discord, and a Tiltify access token, found in your Connected Apps in your Tiltify dashboard. Finally, type `node index.js` in the console to start the bot.

## Commands
This bot uses slash commands, they can be found by typing `/` in Discord and clicking the bot icon. Locked commands are only accesible once the bot has been setup with `/setup`.

#### General Commands
- `/find <type> <query>`: Search for active campaigns by user, team, or cause
- `/ping`: Test the bot's response time to the server
- `/setup <type> <id>`: Setup the bot with your Tiltify campaign information

#### Locked Commands
- `/add <id>`: Add a campaign to the list of tracked campaigns
- `/channel <id>`: Change the channel where donations are posted
- `/delete`: Deactivate the bot and delete all data
- `/list`: List all tracked campaigns
- `/refresh`: Refresh all campaigns attatched to a team, cause or event
- `/remove <id>`: Remove a campaign for the list of tracked campaigns
- `/tiltify <action>`: Start or stop the showing of donations

## Usage
To get started, run the `/setup` command, select your type, and enter a ID. If sucsessful, the bot will find an active campaign to track. Finally, run `/tiltify start` to start the donation stream.

To find active campaigns, run `/find`, select your type and enter a search query. If found, the bot will list all active campaigns and their ID's.

## Support
For support please reach out to nicnacnic#5683 on Discord. Thanks for using this bot!
