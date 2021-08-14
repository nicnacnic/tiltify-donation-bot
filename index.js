const fs = require('fs');
const Discord = require('discord.js');
const { token, donationRefresh } = require('./config.json');
const { fetchData, generateData, generateEmbed, listEmbedGenerator, convertToSlug, titleCase, globalCommandData, guildCommandData } = require('./utils');
let guildData = JSON.parse(fs.readFileSync('./guilds.json'));

const client = new Discord.Client({ intents: ['GUILDS', 'GUILD_MESSAGES'] });

client.once('ready', async () => {

	// Check for global commands.
	const commandList = await client.api.applications(client.user.id).commands.get();
	if (commandList === undefined || commandList.length !== 3) {
		await client.application?.commands.set(globalCommandData)
		console.log('First launch detected, note that it can take up to an hour for global slash commands to show up in your server. Thanks for your patience!')
	}
	console.log('Global command check complete, the bot is now online.');
	updateStatus();
	dailyRefresh();

	// Check donations every n seconds (defined in config).
	setInterval(function () {
		guildData.forEach(element => {
			if (element.active) {
				element.campaigns.forEach(campaign => {
					let i = guildData.findIndex(item => item.guild === element.guild)
					let j = guildData[i].campaigns.findIndex(item => item.id === campaign.id)
					let donation;
					fetchData('campaigns', `${campaign.id}/donations`, (callback) => {
						donation = callback.data[0];
						if (donation.completedAt + 2.592e8 <= Date.now()) {
							client.channels.cache.get(guildData[i].channel).send('No donations have been detected in the last 72 hours, therefore the bot has removed campaign `' + guildData[i].campaigns[j].name + '` to save resources. To add the campaign again please use `/add`.');
							guildData[i].campaigns.splice(j, 1);
							if (guildData[i].campaigns.length === 0)
								guildData[i].active = false;
							writeData();
						}
						else {
							try {
								if (guildData[i].campaigns[j].lastDonationId !== donation.id) {
									generateEmbed(campaign, donation, (donationEmbed, incentiveEmbed) => {
										client.channels.cache.get(guildData[i].channel).send({ embeds: [donationEmbed] })
										if (incentiveEmbed !== undefined)
											client.channels.cache.get(guildData[i].channel).send({ embeds: [incentiveEmbed] })
									})
									guildData[i].campaigns[j].lastDonationId = donation.id;
									writeData();
								}
							} catch { }
						}
					});
				})
			}
		})
	}, donationRefresh)

	// Auto refresh data every 12 hours.
	setInterval(function () { dailyRefresh() }, 43200000);

	// Check and route a command.
	client.on('interactionCreate', async interaction => {
		await interaction.defer();
		const botID = await interaction.guild.members.fetch(client.user.id);
		if (interaction.channel.permissionsFor(botID).has("MANAGE_MESSAGES")) {
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
		}
		else
			interaction.editReply({ content: 'You do not have permission to use this command.', ephemeral: true });
	});

	// Update the status message in Discord.
	function updateStatus() {
		let numCampaigns = 0;
		guildData.forEach(guild => guild.campaigns.forEach(campaign => numCampaigns++))
		client.user.setPresence({ status: "online" });
		client.user.setActivity(numCampaigns + ' campaigns...', { type: "WATCHING" });
	}

	// Check bot ping.
	function pingPong(interaction) {
		interaction.editReply('`' + (Date.now() - interaction.createdTimestamp) + '` ms');
	}

	// Initial bot setup. (/setup)
	async function setupTiltify(interaction) {
		if (guildData.some(element => element.guild === interaction.guildID)) {
			interaction.editReply('This server is already in the database, please use `/add` to add a campaign or `/delete` .')
			return;
		}
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
					if (result.data.disbanded) {
						interaction.editReply('`' + result.data.name + '` has been disbanded, please choose an active team.');
						return;
					}
					fetchData('teams', interaction.options.get('id').value + '/campaigns?count=100', async (teamData) => {
						if (teamData.meta.status === 200) {
							teamData.data.forEach(campaign => {
								if (campaign.status !== 'retired') {
									number++;
									generateData(campaign, (callback) => {
										dataToWrite.campaigns.push(callback)
									});
								}
							})
							dataToWrite.connectedId = interaction.options.get('id').value;
							await guildData.push(dataToWrite);
							writeData();
							createGuildCommands(interaction);
							interaction.editReply('Donations have been setup for team `' + result.data.name + '`, ' + number + ' active campaigns were found.')
							return;
						}
						error(interaction, result.meta.status)
						return;
					});
					break;
				case 'causes':
					interaction.editReply('Due to buisness requirements, retrieving campaings from causes and fundraising events is currently disabled. For more information, visit <https://github.com/Tiltify/api/issues/21#issuecomment-820740664>. If you are a cause and have API access, please contact nicnacnic#5683 to re-enable this feature.')
					break;

				case 'fundraising-events':
					interaction.editReply('Due to buisness requirements, retrieving campaings from causes and fundraising events is currently disabled. For more information, visit <https://github.com/Tiltify/api/issues/21#issuecomment-820740664>. If you are a cause and have API access, please contact nicnacnic#5683 to re-enable this feature.')
					break;
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
			interaction.editReply('Tiltify donations have been **enabled** on this server!')
		else
			interaction.editReply('Tiltify donations have been **disabled** on this server.')
		return;
	}

	// Add campaign to track. (/add)
	async function addCampaign(interaction) {
		fetchData('campaigns', interaction.options.get('id').value, (campaignData) => {
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
		if (guildData[i].campaigns.length > 1) {
			let j = guildData[i].campaigns.findIndex(item => item.id === interaction.options.get('id').value)
			interaction.editReply('Campaign `' + guildData[i].campaigns[j].name + '` has been removed.')
			guildData[i].campaigns.splice(j, 1);
			writeData();
			return;
		}
		interaction.editReply('There is only one active campaign, please use `/delete` instead.')
	}

	// Generate embed of all tracked campaigns. (/list)
	function generateListEmbed(interaction) {
		let i = guildData.findIndex(item => item.guild === interaction.guildID)
		listEmbedGenerator(i, guildData, (callback) => interaction.editReply({ embeds: [callback] }))
		return;
	}

	// Change channel where donations are shown. (/channel)
	function changeChannel(interaction) {
		let i = guildData.findIndex(item => item.guild === interaction.guildID)
		interaction.editReply('Donations channel has been changed to <#' + interaction.options.get('id').value + '>')
		guildData[i].channel = interaction.options.get('id').value;
		writeData();
	}

	// Refresh campaign data. (/refresh)
	async function refreshData(interaction) {
		let i = guildData.findIndex(item => item.guild === interaction.guildID)
		for (let j = 0; j < guildData[i].campaigns.length; j++) {
			fetchData('campaigns', guildData[i].campaigns[j].id, (campaignData) => {
				if (campaignData.data.status === 'retired') {
					guildData[i].campaigns.splice(j, 1);
					writeData();
				}
				if (guildData[i].connectedId !== undefined) {
					fetchData(guildData[i].type, guildData[i].connectedId + '/campaigns?count=100', (result) => {
						result.data.forEach(campaign => {
							if (campaign.status !== 'retired' && !guildData[i].campaigns.includes(item => item.id === campaign.id)) {
								generateData(campaign, (callback) => {
									guildData[i].campaigns.push(callback)
									writeData();
								});
							}
						})
					})
				}
			});
		}
		interaction.editReply('Campaigns have been refreshed.');
		return;
	}

	// Delete all data. (/delete)
	async function deleteData(interaction) {
		await client.guilds.cache.get(interaction.guildID).commands.set([]);
		let i = guildData.findIndex(item => item.guild === interaction.guildID)
		guildData.splice(i, 1);
		writeData();
		interaction.editReply('The bot was deactivated. To set up again, please use `/setup`.');
	}

	// Search for active campaigns. (/find)
	async function findCampaigns(interaction) {
		let resultId;
		switch (interaction.options.get('type').value) {
			case 'users':
				resultId = 'User ID: '
				break;
			case 'teams':
				resultId = 'Team ID: '
				break;
			case 'fundraising-events':
				resultId = 'Event ID: '
				break;
		}
		convertToSlug(interaction.options.get('query').value, (query) => {
			fetchData(interaction.options.get('type').value, query, (result) => {
				if (result.meta.status !== 200)
					interaction.editReply('Query `' + interaction.options.get('query').value + '` could not be found.')
				else {
					let name;
					if (interaction.options.get('type').value === 'users')
						name = result.data.username;
					else
						name = result.data.name;
					fetchData(interaction.options.get('type').value, result.data.id + '/campaigns?count=100', (campaignData) => {
						if (campaignData.meta.status !== 200)
							interaction.editReply('Query `' + interaction.options.get('query').value + '` could not be found.')
						else {
							titleCase(name, (title) => {
								let findEmbed = {
									title: title + '\'s Active Campaigns',
									description: resultId + result.data.id,
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
							});
						}
					});
				}
			});
		});
	}

	// Auto refresh data every 12 hours.
	function dailyRefresh() {
		for (let i = 0; i < guildData.length; i++) {
			for (let j = 0; j < guildData[i].campaigns.length; j++) {
				fetchData('campaigns', guildData[i].campaigns[j].id, (result) => {
					if (result.data.status === 'retired' || result.meta.status !== 200)
						guildData[i].campaigns.splice(j, 1);
					writeData();
				})
			}
		}
		for (let i = 0; i < guildData.length; i++) {
			if (guildData[i].connectedId !== undefined) {
				fetchData(guildData[i].type, guildData[i].connectedId + '/campaigns?count=100', (result) => {
					result.data.forEach(campaign => {
						if (campaign.status !== 'retired' && !guildData[i].campaigns.includes(item => item.id === campaign.id))
							generateData(campaign, (callback) => {
								guildData[i].campaigns.push(callback);
								writeData();
							})
					})
				});
			}
		}
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