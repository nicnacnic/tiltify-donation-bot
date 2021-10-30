const fs = require('fs');
const { Client, Intents, MessageEmbed } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { token, donationRefresh } = require('./config.json');
const { globalCommands, guildCommands } = require('./commands')
const utils = require('./utils');
global.guildData = JSON.parse(fs.readFileSync('./guilds.json'));

const rest = new REST({ version: '9' }).setToken(token);
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

client.once('ready', () => {
	rest.put(
		Routes.applicationCommands(client.user.id),
		{ body: globalCommands },
	);

	console.log('The bot is now online! If launching for the first time, global commands might take up to an hour to appear.');

	// Check donations every n seconds (defined in config).
	setInterval(() => {
		guildData.forEach(guild => {
			if (guild.active && guild.campaigns.length <= 0) {
				guild.active = false;
				writeData();
			}
			else if (guild.active) {
				guild.campaigns.forEach(campaign => {
					try {
						utils.fetchData('campaigns', `${campaign.id}/donations`, (result) => {
							let i = guildData.findIndex(item => item.guild === guild.guild)
							let j = guild.campaigns.findIndex(item => item.id === campaign.id)
							if (result.data[0].id === campaign.lastDonationId && campaign.lastDonationTime + 2.592e+8 < Date.now()) {
								client.channels.cache.get(guild.channel).send(`No donations have been detected in the last 72 hours, therefore the bot has removed campaign \`${campaign.name}\` to save resources. To add the campaign again, please use \`/add\`.`);
								guildData[i].campaigns.splice(j)
							}
							else if (result.data[0].id !== campaign.lastDonationId) {
								for (let k = 0; k < result.data.length; k++) {
									if (result.data[k].id !== campaign.lastDonationId)
										utils.generateEmbed(client, campaign, result.data[k], guild.channel)
									else
										break;
								}
								guildData[i].campaigns[j].lastDonationId = result.data[0].id;
								guildData[i].campaigns[j].lastDonationTime = result.data[0].completedAt;
								writeData();
							}
						})
					}
					catch (e) {
						console.log(e)
					}
				})
			}
		})
	}, donationRefresh)

	// Check and route a command.
	client.on('interactionCreate', async interaction => {
		let options = [];
		interaction.options._hoistedOptions.forEach(option => {
			options.push({ name: option.name, value: option.value })
		})
		console.log({
			guildName: client.guilds.cache.get(interaction.guildId).name,
			guildId: interaction.guildId,
			channelName: client.channels.cache.get(interaction.channelId).name,
			channelId: interaction.channelId,
			userName: interaction.user.username,
			userId: interaction.user.id,
			command: interaction.commandName,
			options: options,
			timestamp: Date.now()
		})
		await interaction.deferReply();
		switch (interaction.commandName) {
			case 'ping': ping(interaction); break;
			case 'setup': setup(interaction); break;
			case 'tiltify': tiltify(interaction); break;
			case 'add': add(interaction); break;
			case 'remove': remove(interaction); break;
			case 'list': list(interaction); break;
			case 'channel': channel(interaction); break;
			case 'refresh': refresh(interaction); break;
			case 'delete': deleteData(interaction); break;
			case 'find': find(interaction); break;
		}
	});

	// Check bot ping.
	function ping(interaction) {
		interaction.editReply('`' + (interaction.createdTimestamp - Date.now()) + '` ms');
	}

	// Initial bot setup. (/setup)
	function setup(interaction) {
		if (guildData.some(element => element.guild === interaction.guildID)) {
			interaction.editReply('This server is already in the database, please use `/add` to add a campaign or `/delete` .')
			return;
		}
		utils.fetchData(interaction.options.getString('type'), interaction.options.getInteger('id'), (result) => {
			if (result.meta.status === 200 && (interaction.options.getChannel('channel').type === 'GUILD_TEXT' || interaction.options.getChannel('channel').type === 'GUILD_NEWS')) {
				guildData.push({
					guild: interaction.guildId,
					channel: interaction.options.getChannel('channel').id,
					type: interaction.options.getString('type'),
					active: false,
					campaigns: [],
				})
				writeData()
				switch (interaction.options.getString('type')) {
					case 'campaigns':
						if (result.data.status === 'retired') {
							interaction.editReply(`\`${result.data.name}\` has already ended, please choose an active campaign.`)
							return;
						}
						utils.generateData(result.data, guildData.length - 1)
						createGuildCommands(interaction);
						interaction.editReply(`Donations have been setup for campaign \`${result.data.name}\`.`)
						break;
					case 'teams':
						if (result.data.disbanded) {
							interaction.editReply('`' + result.data.name + '` has been disbanded, please choose an active team.');
							return;
						}
						let number = 0;
						utils.fetchData('teams', interaction.options.getInteger('id') + '/campaigns?count=100', (teamData) => {
							if (teamData.meta.status === 200) {
								teamData.data.forEach(campaign => {
									number++;
									utils.generateData(campaign, guildData.length - 1)
								})
								guildData[guildData.length - 1].connectedId = interaction.options.getInteger('id');
								writeData();
								createGuildCommands(interaction);
								interaction.editReply(`Donation have been setup for team \`${result.data.name}\`. ${number} active campaigns were found.`)
							}
						});
						break;
					case 'causes':
						interaction.editReply('Due to buisness requirements, retrieving campaings from causes and fundraising events is currently disabled. For more information, visit <https://github.com/Tiltify/api/issues/21#issuecomment-820740664>. If you are a cause and have API access, please contact nicnacnic#5683 to re-enable this feature.')
						break;

					case 'fundraising-events':
						interaction.editReply('Due to buisness requirements, retrieving campaings from causes and fundraising events is currently disabled. For more information, visit <https://github.com/Tiltify/api/issues/21#issuecomment-820740664>. If you are a cause and have API access, please contact nicnacnic#5683 to re-enable this feature.')
						break;
				}
			}
			else if (interaction.options.getChannel('channel').type !== 'GUILD_TEXT')
				interaction.editReply(`${interaction.options.getChannel('channel')} is not a text channel!`)
			else
				error(interaction, result.meta.status)
		});
	}

	// Error codes to display in case.
	function error(interaction, errorCode) {
		console.log(errorCode)
		switch (errorCode) {
			case 400: interaction.editReply('There was an error, please contact the developer of the bot.'); break;
			case 401: interaction.editReply('Your Tiltify access token is invalid. Please check your access token in the bot\'s config file.'); break;
			case 403: interaction.editReply('You do not have access to this resource. Please check your access token in the bot\'s config file.'); break;
			case 404: interaction.editReply('Your campaign/team/cause/event was not found. Please check your id.'); break;
			case 422: interaction.editReply('There was an error, please contact the developer of the bot.'); break;
			default: interaction.editReply('There was a server error. Please try again later.'); break;
		}
	}

	// Start/stop showing donations. (/tiltify)
	async function tiltify(interaction) {
		let i = await guildData.findIndex(item => item.guild === interaction.guildId);
		switch (interaction.options.getString('action')) {
			case 'start': guildData[i].active = true; interaction.editReply('Tiltify donations have been **enabled** on this server!'); break;
			case 'stop': guildData[i].active = false; interaction.editReply('Tiltify donations have been **disabled** on this server!'); break;
		}
		writeData()
	}

	// Add campaign to track. (/add)
	function add(interaction) {
		utils.fetchData('campaigns', interaction.options.getInteger('id'), (result) => {
			if (result.meta.status === 200 && result.data.status === 'retired')
				interaction.editReply(`\`${result.data.name}\` has already ended, please choose an active campaign.`)
			else if (result.meta.status === 200) {
				let i = guildData.findIndex(item => item.guild === interaction.guildId)
				utils.generateData(result.data, i)
				interaction.editReply(`Campaign \`${result.data.name}\` has been added.`)
			}
			else
				error(interaction, result.meta.status)
		});
	}

	// Remove tracked campaign. (/remove)
	function remove(interaction) {
		let i = guildData.findIndex(item => item.guild === interaction.guildId)
		let j = guildData[i].campaigns.findIndex(item => item.id === interaction.options.getInteger('id'))
		if (guildData[i].campaigns.length > 1 && j >= 0) {
			interaction.editReply(`Campaign \`${guildData[i].campaigns[j].name}\` has been removed.`)
			guildData[i].campaigns.splice(j);
			writeData();
		}
		else if (j === -1)
			interaction.editReply(`Campaign does not exist in the database!`)
		else
			interaction.editReply('There is only one active campaign, please use `/delete` instead.')
	}

	// Generate embed of all tracked campaigns. (/list)
	function list(interaction) {
		let i = guildData.findIndex(item => item.guild === interaction.guildId)
		utils.generateListEmbed(i, interaction)
	}

	// Change channel where donations are shown. (/channel)
	function channel(interaction) {
		let i = guildData.findIndex(item => item.guild === interaction.guildId)
		if (interaction.options.getChannel('channel').type === 'GUILD_TEXT') {
			interaction.editReply(`Donations channel has been changed to ${interaction.options.getChannel('channel')}.`)
			guildData[i].channel = interaction.options.getChannel('channel').id;
			writeData();
		}
		else
			interaction.editReply(`${interaction.options.getChannel('channel')} is not a text channel!`)
	}

	// Delete all data. (/delete)
	function deleteData(interaction) {
		rest.put(
			Routes.applicationGuildCommands(client.user.id, interaction.guildId),
			{ body: {} },
		);
		let i = guildData.findIndex(item => item.guild === interaction.guildId)
		guildData.splice(i);
		writeData();
		interaction.editReply('The bot was deactivated. To set up again, please use `/setup`.');
	}

	// Search for active campaigns. (/find)
	function find(interaction) {
		utils.fetchData(interaction.options.getString('type'), utils.convertToSlug(interaction.options.getString('query')), (result) => {
			try {
				utils.fetchData(interaction.options.get('type').value, result.data.id + '/campaigns?count=100', (campaignData) => {
					let findEmbed = new MessageEmbed()
						.setURL(`https://tiltify.com`)
						.setTimestamp();
					switch (interaction.options.getString('type')) {
						case 'users': findEmbed.setTitle(`${result.data.username}'s Active Campaigns`); break;
						default: findEmbed.setTitle(`${result.data.name}'s Active Campaigns`); break;
					}
					switch (interaction.options.getString('type')) {
						case 'users': findEmbed.description = `User ID: ${result.data.id}`; break;
						case 'teams': findEmbed.description = `Team ID: ${result.data.id}`; break;
						case 'fundraising-events': findEmbed.description = `Event ID: ${result.data.id}`; break;
					}
					campaignData.data.forEach(campaign => {
						if (campaign.status !== 'retired')
							findEmbed.addField(campaign.name, `ID: ${campaign.id}`)
					})
					if (findEmbed.fields.length > 0)
						interaction.editReply({ embeds: [findEmbed] })
					else
						interaction.editReply(`\`${interaction.options.getString('query')}\` does not have any active campaigns.`)
				});
			} catch {
				interaction.editReply(`Query \`${interaction.options.getString('query')}\` could not be found.`)
			}
		});
	}

	// Create guild slash commands.
	async function createGuildCommands(interaction) {
		await rest.put(
			Routes.applicationGuildCommands(client.user.id, interaction.guildId),
			{ body: guildCommands },
		);
		return;
	}
});

// Write data to database.
function writeData() {
	fs.writeFileSync('./guilds.json', JSON.stringify(guildData));
}

// Watch for changes to the guild database.
fs.watchFile('./guilds.json', () => {
	let numCampaigns = 0;
	guildData = JSON.parse(fs.readFileSync('./guilds.json'))
	guildData.forEach(guild => guild.campaigns.forEach(campaign => numCampaigns++))
	//client.user.setPresence({ status: "online" });
	client.user.setActivity(numCampaigns + ' campaigns...', { type: "WATCHING" });
});

// Login to Discord using token supplied in the config.
client.login(token);
