const { SlashCommandBuilder } = require('@discordjs/builders'); 

const globalCommands = [
    new SlashCommandBuilder()
        .setName('find')
        .setDescription('Search for active campaigns by user, team, or cause')
        .addStringOption(option =>
            option.setName('type')
            .setDescription('Your type of search')
            .addChoice('user', 'users')
            .addChoice('team', 'teams')
            .addChoice('cause', 'causes')
            .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('query')
            .setDescription('Your user, team, or cause id')
            .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Setup the bot with your Tiltify campaign information')
        .addStringOption(option => 
            option.setName('type')
            .setDescription('Your type of campaign')
            .addChoice('campaign', 'campaigns')
            .addChoice('team', 'teams')
            .addChoice('cause', 'causes')
            .addChoice('event', 'fundraising-events')
            .setRequired(true)
        )
        .addIntegerOption(option => 
            option.setName('id')
            .setDescription('Your Tiltify campaign id')
            .setRequired(true)
        )
        .addChannelOption(option => 
            option.setName('channel')
            .setDescription('The channel to post donations to')
            .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Test response time to the server')
].map(command => command.toJSON());

const guildCommands = [
    new SlashCommandBuilder()
        .setName('add')
        .setDescription('Add a campaign to the list of tracked campaigns')
        .addIntegerOption(option => 
            option.setName('id')
            .setDescription('A valid Tiltify campaign id')
            .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a campaign from the list of tracked campaings')
        .addIntegerOption(option => 
            option.setName('id')
            .setDescription('A valid Tiltify campaign id')
            .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('list')
        .setDescription('List all tracked campaigns'),
    new SlashCommandBuilder()
        .setName('channel')
        .setDescription('Change teh channel where donations are posted')
        .addChannelOption(option => 
            option.setName('channel')
            .setDescription('The new text channel')
            .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('tiltify')
        .setDescription('Start or stop the fetching of donations')
        .addStringOption(option => 
            option.setName('action')
            .setDescription('Start or stop the fetching of donations')
            .addChoice('start', 'start')
            .addChoice('stop', 'stop')
            .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('delete')
        .setDescription('Deactive the bot and delete all data')
].map(command => command.toJSON());

module.exports = { globalCommands, guildCommands }