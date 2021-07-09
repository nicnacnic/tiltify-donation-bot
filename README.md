# tiltify-donation-bot
A bot that posts Tiltify donation data to Discord.

![image](https://user-images.githubusercontent.com/39160563/125010924-7d006b00-e035-11eb-9884-6364a79f8532.png)


## Hosted Version
This verion of the bot is meant to be self-hosted. To deploy the hosted version, invite the bot via this link: [https://discord.com/oauth2/authorize?client_id=815284001618395238&scope=bot](https://discord.com/oauth2/authorize?client_id=815284001618395238&scope=bot)

## Requirements
The user configuring the bot must have the manage messages or admin permission on the server to set up the bot. Be warned, once setup **anyone** can access the bot's commands (meaning they can add or delete campaigns, start/stop the donation stream, etc...), so it's recommended that this bot is given a special role with access to a protected channel.

## Installation
You will need a Discord bot token and a Tiltify API access token, obtaining the two are outside the scope of this guide. Download the latest [release](https://github.com/nicnacnic/tiltify-donation-bot/releases), and unzip the files to a folder of your choice. In `config.json`, copy/paste your bot token and access token into the first two fields.

Next, run `node createCommands.js` to create the global slash commands used by the bot. *You only need to do this once.* Note that it might take up to an hour for the slash commands to appear. Finally, run `node index.js` whenever you want to start the bot.

## Usage
To get started, run the `/setup` command, select your type, and enter a ID. If sucsessful, the bot will find an active campaign to track. Finally, run `/tiltify start` to start the donation stream.

To find active campaigns, run `/find`, select your type and enter a search query. If found, the bot will list all active campaigns and their ID's.

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

## Support
For support please reach out to nicnacnic#5683 on Discord. Thanks for using this bot!
