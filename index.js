const fs = require('fs');
const Discord = require('discord.js');
const { token, donationRefresh } = require('./config.json');
const { fetchData, writeData, generateData, generateEmbed, listEmbedGenerator, convertToSlug, guildCommandData } = require('./utils');
let guildData = JSON.parse(fs.readFileSync('./guilds.json'));

const client = new Discord.Client({ intents: ['GUILDS', 'GUILD_MESSAGES'] });

client.once('ready', async () => {

	// Check donations every n seconds (defined in config).
	setInterval(function () {
		guildData.forEach(element => {
			if (element.active) {
				element.campaigns.forEach(campaign => {
					let i = guildData.findIndex(item => item.guild === element.guild)
					let j = guildData[i].campaigns.findIndex(item => item.id === campaign.id)
					let donation;
					fetchData('campaigns', `${campaign.id}/donations`, (callback) => {
						donation = callback;
						try {
							if (guildData[i].campaigns[j].lastDonationId !== donation.data[0].id) {
								generateEmbed(campaign, donation.data[0], (callback) => client.channels.cache.get(guildData[i].channel).send({ embeds: [callback] }))
								guildData[i].campaigns[j].lastDonationId = donation.data[0].id;
								writeData()
							}
						} catch { console.log('There was an error reading donation data on ' + Date.toString()) }
					});
				})
			}
		})
	}, donationRefresh)

	// Check and route a command.
	client.on('interactionCreate', async interaction => {
		switch (interaction.commandName) {
			case 'ping':
				pingPong(interaction);
				break;
			case 'setup':
				setupTiltify(interaction);
				break;
			case 'tiltify':
				startStopDonations(interaction);
				break;
			case 'add':
				addCampaign(interaction);
				break;
			case 'remove':
				removeCampaign(interaction);
				break;
			case 'list':
				generateListEmbed(interaction);
				break;
			case 'channel':
				changeChannel(interaction);
				break;
			case 'refresh':
				refreshData(interaction);
				break;
			case 'delete':
				deleteData(interaction);
				break;
			case 'find':
				findCampaigns(interaction);
				break;
		}
	});
	console.log('The bot is now online. Detailed command information will appear here.');
	updateStatus();

	// Update the status message in Discord.
	function updateStatus() {
		let numCampaigns = 0;
		guildData.forEach(guild => guild.campaigns.forEach(campaign => numCampaigns++))
		client.user.setPresence({ status: "online" });
		client.user.setActivity(numCampaigns + ' campaigns...', { type: "WATCHING" });
	}

	// Check bot ping.
	function pingPong(interaction) {
		interaction.reply('`' + (Date.now() - interaction.createdTimestamp) + '` ms');
	}

	// Initial bot setup. (/setup)
	async function setupTiltify(interaction) {
		if (guildData.some(element => element.guild === interaction.guildID)) {
			interaction.reply('This server is already in the database, please use `/add` to add a campaign or `/delete` .')
			return;
		}
		interaction.defer();
		fetchData(interaction.options.get('type').value, interaction.options.get('id').value, async (result) => {
			if (result.meta.status !== 200) {
				error(interaction, result.meta.status)
				return;
			}
			let number = 0;
			let dataToWrite = {
				guild: interaction.guildID,
				channel: interaction.channelID,
				type: interaction.options.get('type').value,
				active: false,
				campaigns: [],
			}
			switch (interaction.options.get('type').value) {
				case 'campaigns':
					if (result.data.status === 'retired') {
						interaction.editReply('`' + result.data.name + '` has already ended, please choose an active campaign.');
						return;
					}
					generateData(result.data, (callback) => {
						dataToWrite.campaigns.push(callback);
						guildData.push(dataToWrite);
						writeData();
						createGuildCommands(interaction);
						interaction.editReply('Donations have been setup for campaign `' + result.data.name + '`.')
						return;
					})
					break;
				case 'teams':
					let teamData;
					if (result.data.disbanded) {
						interaction.editReply('`' + result.data.name + '` has been disbanded, please choose an active team.');
						return;
					}
					fetchData('teams', interaction.options.get('id').value + '/campaigns?count=100', (callback) => teamData = callback);
					if (teamData.meta.status === 200) {
						teamData.data.forEach(campaign => {
							if (campaign.status !== 'retired') {
								number++;
								generateData(campaign, (callback) => dataToWrite.campaigns.push(callback))
							}
						})
						await dataToWrite.push({ connectedId: interaction.options.get('id').value })
						await guildData.push(dataToWrite);
						writeData();
						createGuildCommands(interaction);
						interaction.editReply('Donations have been setup for team `' + result.data.name + '`, ' + number + ' active campaigns were found.')
						break;
					}
					error(interaction, data.meta.status)
					break;
				case 'causes':
					interaction.editReply('Due to buisness requirements, retrieving campaings from causes and fundraising events is currently disabled. For more information, visit <https://github.com/Tiltify/api/issues/21#issuecomment-820740664>. If you are a cause and have API access, please contact nicnacnic#5683 to re-enable this feature.')
					break;

				// let causeData;
				// fetchData('causes', interaction.options.get('id').value + '/campaigns?count=100', (callback) => causeData = callback);
				// if (causeData.meta.status === 200) {
				// 	causeData.data.forEach(campaign => {
				// 		if (campaign.status !== 'retired') {
				// 			number++;
				// 			generateData(campaign, (callback) => dataToWrite.campaigns.push(callback))
				// 		}
				// 	})
				// dataToWrite.push({ connectedId: interaction.options.get('id').value })
				// 	await guildData.push(dataToWrite);
				// 	writeData();
				// 	createGuildCommands(interaction);
				// 	interaction.editReply('Donations have been setup for cause `' + result.data.name + '`, ' + number + ' active campaigns were found.')
				// 	break;
				// }
				// error(interaction, data.meta.status)
				// break;

				case 'fundraising-events':
					interaction.editReply('Due to buisness requirements, retrieving campaings from causes and fundraising events is currently disabled. For more information, visit <https://github.com/Tiltify/api/issues/21#issuecomment-820740664>. If you are a cause and have API access, please contact nicnacnic#5683 to re-enable this feature.')
					break;

				// let eventData;
				//fetchData('fundraising-events', interaction.options.get('id').value + '/campaigns?count=100', (callback) => eventData = callback);
				// if (eventData.meta.status === 200) {
				// 	eventData.data.forEach(campaign => {
				// 		if (campaign.status !== 'retired') {
				// 			number++;
				// 			generateData(campaign, (callback) => dataToWrite.campaigns.push(callback))
				// 		}
				// 	})
				// dataToWrite.push({ connectedId: interaction.options.get('id').value })
				// 	await guildData.push(dataToWrite);
				// 	writeData();
				// 	createGuildCommands(interaction);
				// 	interaction.editReply('Donations have been setup for event `' + result.data.name + '`, ' + number + ' active campaigns were found.')
				// 	break;
				// }
				// error(interaction, data.meta.status)
				// break;
			}
		});
	}

	// Error codes to display in case.
	function error(interaction, errorCode) {
		switch (errorCode) {
			case 400:
				interaction.editReply('There was an error, please contact the developer of the bot. `400: Bad Request`')
				break;
			case 401:
				interaction.editReply('Your Tiltify access token is invalid. Please check your access token in the bot\'s config file. `401: Not Authorized`')
				break;
			case 403:
				interaction.editReply('You do not have access to this resource. Please check your access token in the bot\'s config file. `403: Forbidden`')
				break;
			case 404:
				interaction.editReply('Your campaign/team/cause/event was not found. Please check your id. `404: Not Found`')
				break;
			case 422:
				interaction.editReply('There was an error, please contact the developer of the bot. `422: Unprocessable Entity`')
				break;
			default:
				interaction.editReply('There was a server error. Please try again later. `500: Internal Server Error`')
				break;
		}
	}

	// Start/stop showing donations. (/tiltify)
	async function startStopDonations(interaction) {
		let action = false;
		if (interaction.options.get('action').value === 'start')
			action = true;
		let i = await guildData.findIndex(item => item.guild === interaction.guildID);
		guildData[i].active = action;
		writeData();
		if (action)
			interaction.reply('Tiltify donations have been **enabled** on this server!')
		else
			interaction.reply('Tiltify donations have been **disabled** on this server.')
		return;
	}

	// Add campaign to track. (/add)
	async function addCampaign(interaction) {
		interaction.defer();
		let campaignData;
		fetchData('campaigns', interaction.options.get('id').value, (callback) => {
			campaignData = callback;
			if (campaignData.meta.status === 200) {
				if (campaignData.data.status === 'retired')
					interaction.editReply('`' + result.data.name + '` has already ended, please choose an active campaign.');
				else {
					let i = guildData.findIndex(item => item.guild === interaction.guildID)
					generateData(campaignData.data, (data) => {
						guildData[i].campaigns.push(data)
						writeData();
						interaction.editReply('Campaign `' + campaignData.data.name + '` has been added.')
						return;
					});
				}
			}
			else
				error(interaction, campaignData.meta.status)
		});
	}

	// Remove tracked campaign. (/remove)
	function removeCampaign(interaction) {
		let i = guildData.findIndex(item => item.guild === interaction.guildID)
		let j = guildData[i].campaigns.findIndex(item => item.id === interaction.options.get('id').value)
		interaction.reply('Campaign `' + guildData[i].campaigns[j].name + '` has been removed.')
		guildData[i].campaigns.splice(j, 1);
		writeData();
		return;
	}

	// Generate embed of all tracked campaigns. (/list)
	function generateListEmbed(interaction) {
		let i = guildData.findIndex(item => item.guild === interaction.guildID)
		listEmbedGenerator(i, guildData, (callback) => interaction.reply({ embeds: [callback] }))
		return;
	}

	// Change channel where donations are shown. (/channel)
	function changeChannel(interaction) {
		let i = guildData.findIndex(item => item.guild === interaction.guildID)
		interaction.reply('Donations channel has been changed to <#' + interaction.options.get('id').value + '>')
		guildData[i].channel = interaction.options.get('id').value;
		writeData();
	}

	// Refresh campaign data. (/refresh)
	async function refreshData(interaction) {
		interaction.defer()
		let trackedCampaigns = [];
		let i = guildData.findIndex(item => item.guild === interaction.guildID)
		for (let j = 0; j < guildData[i].campaigns.length; j++) {
			let campaignData;
			fetchData('campaigns', guildData[i].campaigns[j].id, (callback) => {
				campaignData = callback;
				if (campaignData.data.status === 'retired') {
					guildData[i].campaigns.splice(j, 1);
					writeData();
				}
				guildData[i].campaigns.forEach(item => {
					trackedCampaigns.push(item.id)
				})
				if (guildData[i].connectedId !== undefined) {
					fetchData(guildData[i].type, guildData[i].connectedId + '/campaigns?count=100', (result) => {
						result.data.forEach(campaign => {
							if (campaign.status !== 'retired' && !guildData[i].campaigns.includes(item => item.id === campaign.id)) {
								generateCampaignData(campaign, (callback) => guildData[i].campaigns.push(callback))
								writeData();
							}
						})
					})
				}
				interaction.editReply('Campaigns have been refreshed.')
			});
		}
	}

	// Delete all data. (/delete)
	async function deleteData(interaction) {
		await client.guilds.cache.get(interaction.guildID).commands.set([]);
		let i = guildData.findIndex(item => item.guild === interaction.guildID)
		guildData.splice(i, 1);
		writeData();
		interaction.reply('The bot was deactivated. To set up again, please use `/setup`.');
	}

	// Search for active campaigns. (/find)
	async function findCampaigns(interaction) {
		interaction.defer();
		let query;
		convertToSlug(interaction.options.get('query').value, (callback) => query = callback);
		fetchData(interaction.options.get('type').value, query, (result) => {
			if (result.meta.status !== 200)
				interaction.editReply('Query `' + interaction.options.get('query').value + '` could not be found.')
			else {
				fetchData(interaction.options.get('type').value, result.data.id + '/campaigns?count=100', (campaignData) => {
					if (campaignData.meta.status !== 200)
						interaction.editReply('Query `' + interaction.options.get('query').value + '` could not be found.')
					else {
						let findEmbed = {
							title: 'Search Results',
							url: 'https://tiltify.com',
							fields: [],
							timestamp: new Date(),
						};
						campaignData.data.forEach(campaign => {
							if (campaign.status !== 'retired') {
								findEmbed.fields.push({
									name: campaign.name,
									value: `ID: ${campaign.id}`,
								})
							}
						})
						if (findEmbed.fields.length > 0)
							interaction.editReply({ embeds: [findEmbed] })
						else
							interaction.editReply('`' + interaction.options.get('query').value + '` does not have any active campaigns.')
						return;
					}
				});
			}
		});
	}

	// Create guild slash commands.
	async function createGuildCommands(interaction) {
		await client.guilds.cache.get(interaction.guildID).commands.set(guildCommandData);
		return;
	}

	// Write data to file.
	function writeData() {
		fs.writeFileSync('./guilds.json', JSON.stringify(guildData));
		updateStatus();
	}
});

// Login to Discord using token supplied in the config.
client.login(token);