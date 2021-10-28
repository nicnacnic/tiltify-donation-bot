
const fs = require('fs');
const fetch = require('node-fetch');
const { MessageEmbed } = require('discord.js');
const { tiltifyAccessToken } = require('./config.json');
const utils = require('./utils');

module.exports.fetchData = (type, id, callback) => {
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

module.exports.generateData = (campaign, index) => {
    utils.fetchData('causes', campaign.causeId, (causeData) => {
        let teamID = 0;
        let teamName = 'None';
        if (campaign.team !== undefined)
            teamID = campaign.team.id;
        utils.fetchData('teams', teamID, (result) => {
            if (result.meta.status === 200 && result.data.name !== undefined)
                teamName = result.data.name;
            guildData[index].campaigns.push({
                name: campaign.name,
                id: campaign.id,
                url: campaign.user.url + '/' + campaign.slug,
                avatarUrl: campaign.avatar.src,
                currency: campaign.causeCurrency,
                cause: causeData.data.name,
                team: teamName,
                lastDonationId: 0,
                lastDonationTime: 0
            })
            writeData();
        });
    })
}

module.exports.generateEmbed = (client, campaign, donation, channel) => {
    utils.fetchData('campaigns', campaign.id + '/challenges', (challenges) => {
        utils.fetchData('campaigns', campaign.id + '/polls', (polls) => {
            let donationComment = 'No comment.'
            if (donation.comment !== '' && donation.comment !== undefined && donation.comment !== null)
                donationComment = donation.comment;
            let donationEmbed = new MessageEmbed()
                .setTitle(`${campaign.name} has received a donation!`)
                .setURL(campaign.url)
                .setThumbnail(campaign.avatarUrl)
                .addField(`${donation.name} donates ${convertCurrency(campaign.currency)}${donation.amount}`, donationComment)
                .setTimestamp(donation.completedAt)
                .setFooter(`Donated towards ${campaign.cause}`);

            challenges.data.forEach(challenge => {
                if (donation.challengeId !== undefined && challenge.id === donation.challengeId) {
                    donationEmbed.addField('Challenges', challenge.name)
                    if (challenge.totalAmountRaised >= challenge.amount && challenge.active)
                        generateIncentiveEmbed(client, campaign, challenge)
                }
            })
            polls.data.forEach(poll => {
                poll.options.forEach(pollOption => {
                    if (donation.pollOptionId !== undefined && pollOption.id === donation.pollOptionId)
                        donationEmbed.addField('Polls', `${poll.name} - ${pollOption.name}`)
                })
            })
            client.channels.cache.get(channel).send({ embeds: [donationEmbed] })
        });
    });
}

function generateIncentiveEmbed(client, campaign, challenge) {
    let incentiveEmbed = new MessageEmbed()
        .setTitle(`${campaign.name} has met an incentive!`)
        .setURL(campaign.url)
        .setThumbnail(campaign.avatarUrl)
        .addField(challenge.name, `Goal: ${convertCurrency(campaign.currency)}${challenge.amount}\nTotal Raised: ${convertCurrency(campaign.currency)}${challenge.totalAmountRaised}`)
        .setTimestamp(challenge.updatedAt)
        .setFooter(`Donated towards ${campaign.cause}`)
    client.channels.cache.get(channel).send({ embeds: [incentiveEmbed] })
}

module.exports.generateListEmbed = (index, interaction) => {
    let listEmbed = new MessageEmbed()
        .setTitle('Tracked Campaigns')
        .setURL('https://tiltify.com')
        .setTimestamp()
    guildData[index].campaigns.forEach(campaign => listEmbed.addField(campaign.name, `Cause: ${campaign.cause}\nTeam: ${campaign.team}\nID: ${campaign.id}`))
    interaction.editReply({ embeds: [listEmbed] })
}

module.exports.convertToSlug = (text, callback) => {
    return text.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-')
}

function convertCurrency(currencyCode) {
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
    switch (currencySymbols[currencyCode]) {
        case undefined: return '$'; break;
        default: return currencySymbols[currencyCode]; break;
    }
}

// Write data to file.
function writeData() {
    fs.writeFileSync('./guilds.json', JSON.stringify(guildData));
}