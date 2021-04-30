const fs = require('fs');
const fetch = require("node-fetch");
const readLine = require('readline');

const rl = readLine.createInterface({
	input: process.stdin,
	output: process.stdout,
});

rl.question('Campaign ID: ', (campaignID) => {
	rl.question('Auth Token: ', (authToken) => {
		fetch(`https://tiltify.com/api/v3/campaigns/${campaignID}`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${authToken}`
			},
			dataType: 'json',
		})
			.then(response => response.json())
			.then(json => {
				tiltifyData = json;
				console.log('----- Campaign Info -----');
				console.log(tiltifyData);
			})
		fetch(`https://tiltify.com/api/v3/campaigns/${campaignID}/donations`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${authToken}`
			},
			dataType: 'json',
		})
			.then(response => response.json())
			.then(json => {
				tiltifyData = json;
				console.log('----- Donation Info -----');
				console.log(tiltifyData);
			})
		rl.close();
	});
});