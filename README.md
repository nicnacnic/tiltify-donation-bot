# tiltify-donation-bot
A bot that posts Tiltify donation data to Discord.

![image](https://user-images.githubusercontent.com/39160563/125010924-7d006b00-e035-11eb-9884-6364a79f8532.png)


## Hosted Version
This verion of the bot is meant to be self-hosted. To deploy the hosted version, invite the bot via [this link](https://discord.com/api/oauth2/authorize?client_id=815284001618395238&permissions=2147560448&scope=bot%20applications.commands).

## Requirements
The user configuring the bot must have the manage messages or admin permission on the server to invite the bot. Out of the box, the bot does not come with any permissions system, it is up to the user to figure that out. It is recommended to isolate the bot in a channel that only specific users can type commands to prevent unauthorized users from adding/removing campaigns, starting/stopping donations, etc...

## Installation
You will need a Discord bot token and a Tiltify API access token, obtaining the two are outside the scope of this guide. Download the latest [release](https://github.com/nicnacnic/tiltify-donation-bot/releases), and unzip the files to a folder of your choice. Make sure to also run `npm i` to download all the dependencies! In `config.json`, copy/paste your bot token and access token into the first two fields. Finally, run `node index.js` whenever you want to start the bot. *Note that it can take up to an hour for the slash commands to appear on first startup.*

## Usage
To get started, run the `/setup` command, select your type, enter a ID, and enter a channel. If sucsessful, the bot will find an active campaign to track. Finally, run `/tiltify start` to start the donation stream.

To find active campaigns, run `/find`, select your type and enter a search query. If found, the bot will list all active campaigns and their ID's.

## Commands
This bot uses slash commands, they can be found by typing `/` in Discord and clicking the bot icon. Locked commands are only accesible once the bot has been setup with `/setup`.

#### General Commands
- `/find <type> <query>`: Search for active campaigns by user, team, or cause
- `/ping`: Test the bot's response time to the server
- `/setup <type> <id> <channel>`: Setup the bot with your Tiltify campaign information

#### Locked Commands
- `/add <id>`: Add a campaign to the list of tracked campaigns
- `/channel <channel>`: Change the channel where donations are posted
- `/delete`: Deactivate the bot and delete all data
- `/list`: List all tracked campaigns
- `/remove <id>`: Remove a campaign for the list of tracked campaigns
- `/tiltify <action>`: Start or stop the showing of donations

## Stored Data
The bot stores a variety of information to request and post donations. Be assured that none of this information is sensitive and can be easily accessed by anyone with a Tiltify access token and a bit of knowledge on their API. **For the hosted version, I use my own personal access token to request all this information.** If you have any questions or concerns please contact me.

#### General Info
- Server ID
- Donation Channel ID
- List of Stored Campaigns

#### Campaign-Specific Info
- Name
- ID
- URL
- Avatar Image
- Currency
- Cause Name
- Team (if applicable)
- Last Donation ID
- Last Donation Time

#### Console Logs
- Guild Name
- Guild ID
- Channel Name
- Channel ID
- Username
- User ID
- Command
- Command Options
- Timestamp

## Support
For support please reach out to nicnacnic#5683 on Discord. Thanks for using this bot!
