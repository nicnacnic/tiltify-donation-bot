const fs = require('fs');
const { defaultPrefix } = require('./config.json');
const guildInfo = './data/guilds.json';

module.exports = (client, aliases, perms, callback) => {
	if (typeof aliases === 'string') {
		aliases = [aliases]
	}

	client.on('message', (message) => {
		const { content } = message;

		const data = JSON.parse(fs.readFileSync(guildInfo));
		const guild = data.find(element => element.id === message.guild.id);
		let prefix;

		if (guild === undefined || guild.prefix === undefined)
			prefix = defaultPrefix;
		else
			prefix = guild.prefix;

		aliases.forEach((alias) => {
			const command = `${prefix}${alias}`;
			
			let hasPerms = false;
			if (content.startsWith(`${command} `) || content === command) {
				if (command === prefix + "help" || command === prefix + "h" || command === prefix + "commands" | command === prefix + "guide")
					callback(message, guild, data)
				else if (guild === undefined && command !== prefix + 'setup')
					message.channel.send('The bot has not been set up on this server! Please type `$setup <campaign_ID> <auth_token>` to start, or `$help` for a list of commands.');
				else if (perms) {
					if (message.member.hasPermission('ADMINISTRATOR') || message.member.hasPermission('MANAGE_CHANNELS') || message.member.roles.cache.get(guild.role)) {
						hasPerms = true;
						callback(message, guild, data)
					}
					else {
						hasPerms = false;
						message.reply(`you do not have permission to execute this command!`)
					}
				}
				else {
					hasPerms = true;
					callback(message, guild, data)
				}
				console.log({ guild: message.guild.name, guildID: message.guild.id, message: message.content, messageID: message.id, member: message.member.user.username, memberID: message.member.id, hasPerms: hasPerms });
			}
		})
	})
}