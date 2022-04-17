import axios from 'axios';
import 'dotenv/config';

let currentHeaders = null;
let expiry = null;

/**
 * gets Spotify auth token
 * @return {string} auth token
 */
const getAuthToken = async () => {
	let token = null;
	const myHeaders = {
		Authorization: `Basic ${Buffer.from(
			`${process.env.WORKER_CLIENT_ID}:${process.env.WORKER_CLIENT_SECRET}`,
			'utf-8'
		).toString('base64')}`,
		'Content-Type': 'application/x-www-form-urlencoded'
	};

	await axios
		.post('https://accounts.spotify.com/api/token', 'grant_type=client_credentials', { headers: myHeaders })
		.then(
			(response) => {
				if (response.status == 200) {
					// If affirmative status
					token = response.data;
				} else {
					// If negative status
					console.log(`Spotify gave invalid code ${response.status}`);
				}
			},
			(error) => {
				// If error with request
				console.log(error);
			}
		);
	return token;
};

/**
 * refreshes the auth token if necessary. should be called before any Spotify API calls
 */
const refreshHeader = async () => {
	if (!currentHeaders || expiry < Date.now() + 15 * 60 * 1000) {
		let data = await getAuthToken();
		currentHeaders = {
			Authorization: `Bearer ${data.access_token}`
		};
		expiry = Date.now() + 60 * 60 * 1000;
	}
};

/**
 * gets an array of track ids present in a playlist.slice(offset, offset+51)
 * 
 * @param {string} playlistID a playlist's id
 * @param {number} offset
 * @return {[string]} an array of track ids
 */
const getTrackIDsInPlaylistHelper = async (playlistID, offset) => {
	await refreshHeader();
	const api_url = `https://api.spotify.com/v1/playlists/${playlistID}/tracks?limit=50&offset=${offset}`;

	try {
		const response = await axios.get(api_url, {
			headers: currentHeaders
		});

		return response.data.items.map((item) => {
			return item.track.id;
		});
	} catch (error) {
		if (error.response.status == 429) {
			let delay = error.response.headers['retry-after'] * 1000;
			console.log(`rate limit! waiting ${delay} ms`);

			await setTimeout(() => {}, delay);
			return await getTrackIDsInPlaylistHelper(playlistID, offset);
		} else {
			console.log(error);
		}
	}
};

/**
 * gets an array of track ids present in a given playlist id
 * 
 * @param {string} playlistID a playlist's id
 * @return {[string]} an array of track ids
 */
const getTrackIDsInPlaylist = async (playlistID) => {
	let halves = await Promise.all([
		getTrackIDsInPlaylistHelper(playlistID, 0),
		getTrackIDsInPlaylistHelper(playlistID, 50)
	]);
	return halves[0].concat(halves[1]);
};

/**
 * gets an array of audio features objects for an array of track ids
 * 
 * @param {[string]} trackIds an array of track ids
 * @return {[Object]} an a array of audio feature objects
 */
const getTracksAudioFeatures = async (trackIDs) => {
	await refreshHeader();
	const api_url = `https://api.spotify.com/v1/audio-features?ids=${Array.from(trackIDs).join(',')}`;

	try {
		const response = await axios.get(api_url, {
			headers: currentHeaders
		});
		return response.data['audio_features'];
	} catch (error) {
		if (error.response.status == 429) {
			let delay = error.response.headers['retry-after'] * 1000;
			console.log(`rate limit! waiting ${delay} ms`);

			await setTimeout(() => {}, delay);
			return await getTracksAudioFeatures(trackIDs);
		} else {
			console.log(error);
		}
	}
};

/**
 * creates a playlist using the given trackids
 * 
 * @param {[string]} trackIds an array of track ids
 * @return {string} a playlistID containing the given trackIDs
 */
const makePlaylist = async (trackIDs) => {
	await refreshHeader();
	const api_url = `https://api.spotify.com/v1/audio-features?ids=${Array.from(trackIDs).join(',')}`;

	try {
		const response = await axios.get(api_url, {
			headers: currentHeaders
		});
		return response.data['audio_features'];
	} catch (error) {
		console.log(error);
	}
};

export { getTrackIDsInPlaylist, getTracksAudioFeatures };
