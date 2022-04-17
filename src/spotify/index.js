import axios from 'axios';
import 'dotenv/config';
import { makeSerializedKDT /*deserializeKDT, kNearest*/ } from '../kd/utilities.js';
// import SongNode from '../kd/song_node.js';
import fs from 'fs';

let currentHeaders = null;
let expiry = null;

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

const refreshHeader = async () => {
	if (!currentHeaders || expiry < Date.now() + 15 * 60 * 1000) {
		let data = await getAuthToken();
		currentHeaders = {
			Authorization: `Bearer ${data.access_token}`
		};
		expiry = Date.now() + 60 * 60 * 1000;
	}
};

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
		console.log(error);
	}
};

const getTrackIDsInPlaylist = async (playlistID) => {
	let halves = await Promise.all([
		getTrackIDsInPlaylistHelper(playlistID, 0),
		getTrackIDsInPlaylistHelper(playlistID, 50)
	]);
	return halves[0].concat(halves[1]);
};

/**
 * converts the song ids in multiple playlists to a single set of song ids
 * 
 * @param {[[string]]} playlists an array of playlists. each playlist is an array of song ids
 * @return {Set(string)} an a array of <=100 song ids
 * 
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
		console.log(error);
	}
};

/**
 * converts the song ids in multiple playlists to a single set of song ids
 * 
 * @param {[[string]]} playlists an array of playlists. each playlist is an array of song ids
 * @return {Set(string)} an a array of <=100 song ids
 * 
 */
const get100Tracks = (playlists) => {
	let i = 0;
	let playlist = 0;
	const tracks = new Set();

	while (i < 100 && tracks.size < 100) {
		if (playlist >= playlists.length) {
			playlist = 0;
			i++;
		}
		if (i < playlists[playlist].length) {
			tracks.add(playlists[playlist][i]);
		}
		playlist++;
	}
	return tracks;
};

const main = async () => {
  let rawdata = fs.readFileSync('src/scraping/fullsScrape.json');
  let countriesToPlaylists = JSON.parse(rawdata);

  Object.entries(countriesToPlaylistIDs).forEach( ([country, playlistIDs]) => {

    const trackIDsPerPlaylist = await Promise.all(playlistIDs.map((playlistID) => getTrackIDsInPlaylist(playlistID)));

    const unique100Tracks = get100Tracks(trackIDsPerPlaylist);
  
    const unique100AudioFeatures = await getTracksAudioFeatures(unique100Tracks);
  
    const tree = makeSerializedKDT(unique100AudioFeatures);

    // push to DB country, tree
  
    /* TEST CODE
    const newTree = deserializeKDT(tree);
    const s1 = new SongNode(unique100AudioFeatures[0]);
    const nearest = kNearest(newTree, 1, s1);
    console.log(nearest);
    console.log(nearest.length);
    console.log(s1.id)
    */
  });
};

main();
