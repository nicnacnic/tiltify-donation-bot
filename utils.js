const fs = require('fs');
const fetch = require('node-fetch');
const { tiltifyAccessToken } = require('./config.json');
function fetchData(type, id, callback) {
    fetch(`https://tiltify.com/api/v3/${type}/${id}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${tiltifyAccessToken}`
        },
        dataType: 'json',
    }).then(response => response.json())
        .then(data => {
            callback(data)
        });
}

function generateData(campaign, callback) {
    fetchData('causes', campaign.causeId, (causeData) => {
        let teamData = { data: { name: '' } };
        if (campaign.team !== undefined && campaign.team.id !== undefined)
            fetchData('teams', campaign.team.id, (result) => {
                teamData = result;
                callback({
                    name: campaign.name,
                    id: campaign.id,
                    url: campaign.user.url + '/' + campaign.slug,
                    avatarUrl: campaign.avatar.src,
                    currency: campaign.causeCurrency,
                    cause: causeData.data.name,
                    team: teamData.data.name,
                    lastDonationId: 0,
                });
            })
    });
}

function generateEmbed(campaign, donation, callback) {
    let currency;
    convertCurrency(campaign.currency, (result) => {
        currency = result;
        let donationComment = 'No comment.'
        if (donation.comment !== '')
            donationComment = donation.comment;
        let donationEmbed = {
            title: campaign.name + ' received a donation!',
            url: campaign.url,
            thumbnail: {
                url: campaign.avatarUrl,
            },
            fields: [
                {
                    name: `${donation.name} donates ${currency}${donation.amount}`,
                    value: donationComment,
                }
            ],
            timestamp: new Date(),
            footer: {
                text: 'Donated towards cause ' + campaign.cause,
            }
        };
        callback(donationEmbed);
    });
}

function listEmbedGenerator(i, guildData, callback) {
    let type;
    let listEmbed = {
        title: 'Tracked Campaigns',
        url: 'https://tiltify.com',
        fields: [],
        timestamp: new Date(),
    };
    guildData[i].campaigns.forEach(campaign => {
        listEmbed.fields.push({
            name: campaign.name,
            value: `Cause: ${campaign.cause}\nTeam: ${campaign.team}\nID: ${campaign.id}`,
        })
    })
    callback(listEmbed);
}

function convertToSlug(text, callback) {
    callback(text.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-'));
}

function convertCurrency(currencyCode, callback) {
    const currencySymbols = {
        'USD': '$', // US Dollar
        'EUR': '€', // Euro
        'JPY': '¥', // Japanese Yen
        'GBP': '£', // British Pound Sterling
        'AUD': 'A$', // Australian Dollar
        'CAD': 'C$', // Canadian Dollar
        'CHF': 'CHF', // Swiss Franc
        'CNY': 'CN¥', // Chinese Yuan
        'HKD': 'HK$', // Hong Kong Dollar
        'NZD': 'NZ$', // New Zeland Dollar
        'SER': 'kr', // Swedish Krona
        'KRW': '₩', // South Korean Won
        'SGD': 'S$', // Singapore Dollar
        'NOK': 'kr', // Norwegian Krone
        'MXN': 'MX$', // Mexican Peso
        'INR': '₹', // Indian Rupee
        'RUB': '₽', // Russian Ruble
        'ZAR': 'R', // South African Rand
        'TRY': '₺', // Turkish Iira
        'BRL': 'R$', // Brazilian Real
        'TWD': 'NT$', // New Taiwan Dollar
        'DKK': 'kr', // Danish Krone
        'PLN': 'zł', // Polish Zloty
        'THB': '฿', // Thai Baht
        'IDR': 'Rp', // Indonesian Rupiah
        'HUF': 'Ft', // Hungarian Forint
        'CZK': 'Kč', // Czech Krouna
        'ILS': '₪', // Israeli New Sheqel
        'CLP': 'CLP$', // Chilean Peso
        'PHP': '₱', // Philippine Peso
        'AED': 'د.إ', // UAE Dirham
        'COP': 'COL$', // Colombian Peso
        'SAR': '﷼', // Saudi Riyal
        'MYR': 'RM', //Malaysian Ringgit
        'RON': 'L', // Romanian Leu
        'CRC': '₡', // Costa Rican Colón
        'NGN': '₦', // Nigerian Naira
        'PYG': '₲', // Paraguayan Guarani
        'UAH': '₴', // Ukrainian Hryvnia
        'VND': '₫', // Vietnamese Dong
    };
    if (currencySymbols[currencyCode] !== undefined)
        callback(currencySymbols[currencyCode]);
    else
        callback('$');
}

const guildCommandData = [{
    name: 'add',
    description: 'Add a campaign to the list of tracked campaigns',
    options: [{
        name: 'id',
        type: 'INTEGER',
        description: 'A valid Tiltify campaign id',
        required: true,
    }],
},
{
    name: 'remove',
    description: 'Remove a campaign from the list of tracked campaigns',
    options: [{
        name: 'id',
        type: 'INTEGER',
        description: 'A valid Tiltify campaign id',
        required: true,
    }],
},
{
    name: 'refresh',
    description: 'Refresh all campaigns attatched to a team, cause or event',
},
{
    name: 'list',
    description: 'List all tracked campaigns',
},
{
    name: 'channel',
    description: 'Change the channel where donations are posted',
    options: [{
        name: 'id',
        type: 'CHANNEL',
        description: 'A valid channel in your server',
        required: true,
    }],
},
{
    name: 'tiltify',
    description: 'Start or stop the showing of donations',
    options: [{
        name: 'action',
        type: 'STRING',
        description: 'Start or stop the showing of donations',
        required: true,
        choices: [
            {
                name: 'start',
                value: 'start',
            },
            {
                name: 'stop',
                value: 'stop',
            }],
    }]
},
{
    name: 'delete',
    description: 'Deactivate the bot and delete all data',
}];

module.exports = { fetchData, generateData, generateEmbed, listEmbedGenerator, convertToSlug, guildCommandData }