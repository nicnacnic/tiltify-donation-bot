const fs = require('fs');
const fetch = require("node-fetch");
const Discord = require('discord.js');
const command = require('./commands');
const donation = require('./donations');
const { token, defaultPrefix, donationRefresh } = require('./config.json');
const guildData = './data/guilds.json';
let numCampaigns = JSON.parse(fs.readFileSync(guildData)).length;
require('events').EventEmitter.defaultMaxListeners = 15;

const client = new Discord.Client();

client.once('ready', () => {

	setInterval(function() {
		const data = JSON.parse(fs.readFileSync(guildData));
		for (let i = 0; i < data.length; i++) {
			if (data[i].showDonations)
				donation(client, data[i], false, (donation) => {
					data[i].lastDonationID = donation.id;
					fs.writeFileSync(guildData, JSON.stringify(data));
				});
		}
	}, donationRefresh);

	console.log('The bot is now online. Detailed command information will appear here.');
	updateBotStatus();

	command(client, 'setup', true, (message, guild, data) => {
		const content = message.content.split(' ');
		if (!message.guild.me.hasPermission('MANAGE_MESSAGES'))
			message.channel.send('I must have the manage messages permission to do that!');
		else {
			if (content[1] !== undefined && content[2] !== undefined) {
				fetch(`https://tiltify.com/api/v3/campaigns/${content[1]}`, {
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${content[2]}`
					},
					dataType: 'json',
				})
					.then(response => response.json())
					.then(json => {
						tiltifyData = json;
						console.log(tiltifyData);
						if (tiltifyData.meta.status != 200)
							message.channel.send(`Your Tiltify campaign ID or auth token is incorrect!`);
						else {
							if (guild !== undefined) {
								guild.name = message.guild.name;
								guild.id = message.guild.id;
								guild.channel = message.channel.id;
								guild.tiltifyCampaignID = content[1];
								guild.tiltifyAuthToken = content[2];
								guild.campaignURL = 'https://tiltify.com/@' + tiltifyData.data.user.slug + '/' + tiltifyData.data.slug;
								guild.lastDonationID = 0;
								guild.showDonations = false;
								guild.prefix = defaultPrefix;
							}
							else {
								data.push({ name: message.guild.name, id: message.guild.id, channel: message.channel.id, tiltifyCampaignID: content[1], tiltifyAuthToken: content[2], campaignURL: 'https://tiltify.com/@' + tiltifyData.data.user.slug + '/' + tiltifyData.data.slug, showDonations: false, prefix: defaultPrefix });
								numCampaigns++;
								updateBotStatus();
							}
							fs.writeFileSync(guildData, JSON.stringify(data));
							message.channel.send('Donations have been set to campaign ID `' + content[1] + '`.')
						}
					});
			}
			else
				message.channel.send(`No campaign ID or auth token has been specified!`)
			message.delete({ reason: 'To protect your Tiltify auth token from unauthorized access.' })
		}
	});

	command(client, 'role', true, (message, guild, data) => {
		const content = message.content.split(' ');
		if (content[1] !== undefined) {
			guild.role = content[1];
			fs.writeFileSync(guildData, JSON.stringify(data));
			const role = message.guild.roles.cache.get(content[1]);
			client.channels.cache.get(guild.channel).send(`Role set to ${role}` + ' (`' + content[1] + '`)');
		}
		else {
			message.channel.send(`No role ID has beed defined!`);
		}
	});

	command(client, 'tiltify', true, (message, guild, data) => {
		const content = message.content.split(' ');
		if (content[1] === 'start') {
			guild.showDonations = true;
			client.channels.cache.get(guild.channel).send('Tiltify donations have been enabled! Fetching donations every ' + (donationRefresh / 1000) + ' seconds.');
		}
		else if (content[1] === 'stop') {
			guild.showDonations = false;
			client.channels.cache.get(guild.channel).send('Tiltify donations have been disabled.');
		}
		fs.writeFileSync(guildData, JSON.stringify(data));
	});

	command(client, 'delete', true, (message, guild, data) => {
		const index = data.findIndex(element => element.id === guild.id);
		data.splice(index, 1);
		fs.writeFileSync(guildData, JSON.stringify(data));
		numCampaigns--;
		updateBotStatus();
		message.channel.send('`' + message.guild.name + '` was deleted from the database.');
	});

	command(client, 'prefix', true, (message, guild, data) => {
		const content = message.content.split(' ');
		if (content[1] !== undefined) {
			guild.prefix = content[1];
			fs.writeFileSync(guildData, JSON.stringify(data));
			message.channel.send('Bot prefix changed to `' + content[1] + '`');
		}
		else
			message.channel.send('No prefix was specified!')
	});

	command(client, 'ping', false, (message) => {
		message.channel.send('Pong!').then(m => { message.channel.send('`' + (m.createdTimestamp - message.createdTimestamp) + 'ms`') });
	});

	command(client, ['donation', 'd'], false, (message, guild, data) => {
		if (guild.showDonations)
			donation(client, guild, true, (donation) => {
				guild.lastDonationID = donation.id;
				fs.writeFileSync(guildData, JSON.stringify(data));
			});
		else
			message.channel.send('Tiltify donations have not been enabled! To start, run the command `' + guild.prefix + 'tiltify start`')
	});

	command(client, ['creator', 'about'], false, (message) => {
		message.channel.send('Tiltify Bot was created by nicnacnic. Why don\'t you follow him over at https://twitch.tv/nicnacnic and https://twitter.com/nicnacnic11!');
	});

	command(client, ['help', 'commands', 'h'], false, (message, guild) => {
		let prefix = '$';
		if (guild !== undefined)
			prefix = guild.prefix;
		const helpEmbed = new Discord.MessageEmbed()
			.setTitle("Tiltify Bot Help")
			.setURL("https://github.com/nicnacnic/tiltify-donation-bot")
			.setDescription("The default prefix is `$`, but this can be changed.\nPlease note that most commands require special permissions.")
			.addField("General Commands", "`" + prefix + "help`: The help menu. You\'re seeing it right now!\n `" + prefix + "ping`: Pong! Test the response speed to the server.\n`" + prefix + "donation`: Show the most recent donation.\n`" + prefix + "guide`: Don't how to setup the bot? Here's a guide!")
			.addField("Permission Based Commands", "`" + prefix + "setup <campaign_id> <auth_token>`: Setup Tiltify information for the bot.\n`" + prefix + "role <role_id>`: Set the minimum role to use the permission based commands.\n`" + prefix + "tiltify <start/stop>`: Start or stop the live donation feed.\n`" + prefix + "delete`: Deactivate the bot and delete all settings on the server.\n`" + prefix + "prefix <prefix>`: Change the default prefix of the bot.")
			.setThumbnail("https://cdn.discordapp.com/avatars/815284001618395238/610e0bab7664afead2a9eac970444d39.png?size=256")
			.setFooter("Tiltify Bot made by nicnacnic")
			.setTimestamp()
		message.channel.send(helpEmbed);
	});

	command(client, 'guide', false, (message, guild) => {
		const setupEmbed = new Discord.MessageEmbed()
			.setTitle("Tiltify Bot Setup Guide")
			.setURL("https://github.com/nicnacnic/tiltify-donation-bot")
			.setDescription("Did you ask for help setting up this bot? Well here you go!\nBefore we start, make sure you have the manage messages or admin permission on your server. All users with these permissions will be able to change the bot settings.")
			.addField("Configuration", "You will need your Tiltify Campaign ID and Auth Token to set up the bot. The Campaign ID is found in your campaign settings, under the details tab. To generate an Auth Token, go to your account, click on `Connected Apps`, and then go to `Your Applications`. Click on `Create Application`, enter whatever name and URL you want, then click on `Save Changes`. The key you want is the Secret Key, the other ones don't matter.\nNow, type `$setup <campaign_id> <auth_token>`, this should set up the bot and gather all required information. You'll notice that the bot deletes your message, that's to protech your auth token from falling into the wrong hands.")
			.addField("Showing Donations", "With everything set up, you simply need to run `$tiltify start` to start fetching donations. When you're done with your campaign, type `$tiltify stop` to stop fetching donations. Please do this to save on server resources!")
			.addField("Additional Options", "There are a couple additional options for the bot.\nWant to allow other members of your team adjust the bot? Use the command `$role <role_id>` to give them access!\nWant to change the bot prefix? You can do that with `$prefix <prefix>`! Your custom prefix will stay until you decide to deactivate the bot.")
			.addField("Deactivating The Bot", "If you no longer need the bot at all, you can easily delete all saved data from the server. All you have to do is type the command `$delete`.")
			.addField("Help And Support", "If you ever run into issues, please reach out to nicnacnic#5683 on Discord. Thanks for using my Tiltify Bot!")
			.setThumbnail("https://cdn.discordapp.com/avatars/815284001618395238/610e0bab7664afead2a9eac970444d39.png?size=256")
			.setFooter("Tiltify Bot made by nicnacnic")
			.setTimestamp()
		message.author.send(setupEmbed);
	});

	function updateBotStatus() {
		client.user.setPresence({ status: "online" });
		client.user.setActivity(numCampaigns + ' campaigns...', { type: "WATCHING" });
	}
});

client.login(token);