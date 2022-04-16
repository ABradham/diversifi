import cheerio from 'cheerio';
import axios from 'axios';
import util from 'util';

const getAllCountriesAndURLS = async () => {
	const playlistURLsByCountry = {};
	await axios.get('https://everynoise.com/everydemo.cgi?gscope=all&ascope=all&vector=country').then(
		(response) => {
			if (response.status === 200) {
				const html = response.data;
				const $ = cheerio.load(html);
				const allTableRows = $(
					'body > table > tbody > tr > td:nth-child(1) > table > tbody > tr > td:nth-child(3) > a'
				).toArray();

				for (let i = 0; i < 1308; i++) {
					const currentCountryName = $(allTableRows[i]).text();
					const currentURL = $(allTableRows[i]).attr('href');
					// JSON object logic
					if (!playlistURLsByCountry.currentCountryName) {
						// If country is not already in object, create new array at country name
						playlistURLsByCountry[currentCountryName] = [];
					}
					playlistURLsByCountry[currentCountryName].push(currentURL);
				}
			} else {
				throw Error('GET request sent error code');
			}
		},
		(error) => {
			console.log('Could not fetch page from everynoise!');
			console.log(error);
		}
	);
	return playlistURLsByCountry;
};

const getPlaylistIdFromURL = async (url_postfix) => {
	// Construct full URL
	const full_url = `https://everynoise.com/everydemo.cgi${url_postfix}`;
	var playlistID = null;
	// Make Axios Call
	await axios.get(full_url).then(
		(response) => {
			// Load HTML tree into searchable cheerio obj
			const html = response.data;
			const $ = cheerio.load(html);

			// Get playlistId from html element, split by `:` character, and print id
			playlistID = $('#openlink').attr('href').split(':')[2];
		},
		(error) => {
			console.log("Couldn't get page");
			console.log(error);
			return false;
		}
	);
	return playlistID;
};

const getCountriesAndIDsTogether = async () => {
	const countriesAndPlaylistIDs = {};
	const allCountriesAndURLS = await getAllCountriesAndURLS();

	// Iterate over every country
	const countryNamesArr = Object.keys(allCountriesAndURLS);
	for (let i = 0; i < countryNamesArr.length; i++) {
		const currCountryName = countryNamesArr[i];
		const numPlaylists = allCountriesAndURLS[currCountryName].length;

		countriesAndPlaylistIDs[currCountryName] = [];

		for (let j = 0; j < numPlaylists; j++) {
			// Get current playlist id from site
			const spotifyPlaylistID = await getPlaylistIdFromURL(allCountriesAndURLS[currCountryName][j]);
			countriesAndPlaylistIDs[currCountryName].push(spotifyPlaylistID);
			console.log(spotifyPlaylistID);
			await util.promisify(setTimeout)(10);
		}
	}
	console.log(countriesAndPlaylistIDs);
};

getCountriesAndIDsTogether();
