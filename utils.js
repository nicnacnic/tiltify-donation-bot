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
        let teamID = 0;
        let teamName = 'None';
        if (campaign.team !== undefined)
            teamID = campaign.team.id;
        fetchData('teams', teamID, (result) => {
            if (result.meta.status === 200 && result.data.name !== undefined)
                teamName = result.data.name;
            callback({
                name: campaign.name,
                id: campaign.id,
                url: campaign.user.url + '/' + campaign.slug,
                avatarUrl: campaign.avatar.src,
                currency: campaign.causeCurrency,
                cause: causeData.data.name,
                team: teamName,
                lastDonationId: 0,
            });
        });
    })
}

function generateEmbed(campaign, donation, callback) {
    let incentiveEmbed;
    let currency;
    fetchData('campaigns', campaign.id + '/challenges', (challenges) => {
        fetchData('campaigns', campaign.id + '/polls', (polls) => {
            convertCurrency(campaign.currency, (result) => {
                currency = result;
                let donationComment = 'No comment.'
                if (donation.comment !== '' && donation.comment !== undefined && donation.comment !== null)
                    donationComment = donation.comment;
                let donationEmbed = {
                    title: campaign.name + ' has received a donation!',
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
                        text: 'Donated towards ' + campaign.cause,
                    }
                };
                challenges.data.forEach(element => {
                    if (donation.challengeId !== undefined && element.id === donation.challengeId)
                        donationEmbed.fields.push({ name: 'Challenges', value: element.name })
                    if (element.totalAmountRaised >= element.amount && element.active)
                        generateIncentiveEmbed(campaign, element, currency, (embed) => incentiveEmbed = embed)
                })
                polls.data.forEach(element => {
                    element.options.forEach(poll => {
                        if (donation.pollOptionId !== undefined && poll.id === donation.pollOptionId)
                            donationEmbed.fields.push({ name: 'Polls', value: `${element.name} - ${poll.name}` })
                    })
                })
                console.log(donation)
                callback(donationEmbed, incentiveEmbed);
            });
        });
    });
}

function generateIncentiveEmbed(campaign, challenge, currency, callback) {
    callback({
        title: campaign.name + ' has met a challenge!',
        url: campaign.url,
        thumbnail: {
            url: campaign.avatarUrl,
        },
        fields: [
            {
                name: challenge.name,
                value: `Goal: ${currency}${challenge.amount}\nTotal Raised: ${currency}${challenge.totalAmountRaised}`,
            }
        ],
        timestamp: new Date(),
        footer: {
            text: 'Donated towards ' + campaign.cause,
        }
    })
}

function listEmbedGenerator(i, guildData, callback) {
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

function titleCase(str, callback) {
    callback(str.toLowerCase().split(' ').map(function (word) {
        return word.replace(word[0], word[0].toUpperCase());
    }).join(' '));
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

const globalCommandData = [{
    name: 'find',
    description: 'Search for active campaigns by user, team or cause',
    options: [{
        name: 'type',
        type: 'STRING',
        description: 'Your type of search',
        required: true,
        choices: [
            {
                name: 'user',
                value: 'users',
            },
            {
                name: 'team',
                value: 'teams',
            },
            {
                name: 'cause',
                value: 'causes',
            }],
    },
    {
        name: 'query',
        type: 'STRING',
        description: 'Your user, team or cause name/id',
        required: true,
    }],
},
{
    name: 'setup',
    description: 'Setup the bot with your Tiltify campaign information',
    options: [{
        name: 'type',
        type: 'STRING',
        description: 'Your type of campaign',
        required: true,
        choices: [
            {
                name: 'campaign',
                value: 'campaigns',
            },
            {
                name: 'team',
                value: 'teams',
            },
            {
                name: 'cause',
                value: 'causes',
            },
            {
                name: 'event',
                value: 'fundraising-events',
            },
        ]
    },
    {
        name: 'id',
        type: 'INTEGER',
        description: 'Your Tiltify campaign id',
        required: true,
    }],
},
{
    name: 'ping',
    description: 'Test response time to the server',
}]

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

module.exports = { fetchData, generateData, generateEmbed, listEmbedGenerator, convertToSlug, titleCase, globalCommandData, guildCommandData }