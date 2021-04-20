const fs = require('fs');
const { defaultPrefix } = require('./config.json');
const guildInfo = './data/guilds.json';

const allowedCommands = ['help', 'commands', 'guide', 'ping', 'donation']
module.exports = (client, aliases, perms, callback) => {
	if (typeof aliases === 'string') {
		aliases = [aliases]
	}

	client.on('message', (message) => {
		const { content } = message;

		let prefix, data, guild;
		try {
			data = JSON.parse(fs.readFileSync(guildInfo));
			guild = data.find(element => element.id === message.guild.id);
			prefix = guild.prefix;
		} catch {
			prefix = defaultPrefix;
		}

		aliases.forEach((alias) => {
			const command = `${prefix}${alias}`;
			let hasPerms = false;
			if (content.startsWith(`${command}`)) {
				if (allowedCommands.includes(alias))
					callback(message, guild, data)
				else if (guild !== undefined || command === prefix + 'setup') {
					if (perms) {
						if (message.member.hasPermission('ADMINISTRATOR') || message.member.hasPermission('MANAGE_CHANNELS')) {
							hasPerms = true;
							callback(message, guild, data)
						}
						else
							message.reply(`you do not have permission to execute this command!`)
					}
					else
						callback(message, guild, data)
				}
				else
					message.channel.send('The bot has not been set up on this server! Please type `$setup <campaign_ID> <auth_token>` to start, or `$help` for a list of commands.');

				console.log({ guild: message.guild.name, guildID: message.guild.id, message: message.content, messageID: message.id, member: message.member.user.username, memberID: message.member.id, hasPerms: hasPerms });
			}
		})
	})
}