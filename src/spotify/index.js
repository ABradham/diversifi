import axios from 'axios';
import 'dotenv/config';

let currentHeaders = null;
let expiry = null;
let delayUntil = null;

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
				console.log("failed to get auth token");
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
 * function that handles rate limit behavior
 * @return {string} auth token
 */
const onRateLimit = async (response, callback, retries) => {
  let delay = process.env.DEFAULT_DELAY;
  if (retries >= process.env.MAX_RETRIES) {
    console.log("retries exceeded");
    return {
      status: !response.status ? 500 : response.status,
      data: null
    }
  }

  if (!response) {
    console.log(`errored with no response code! waiting ${delay} ms and trying again`);
  }
  else if (response.status == 429) {
    let delay = response.headers['retry-after'] * 1000;
    console.log(`rate limit! waiting ${delay} ms and trying again`);
  }
  else {
    console.log(`error code ${response.status}! waiting ${delay} ms and trying again`);
  }

  delayUntil = Date.now() + delay;
  if (delayUntil > Date.now()) {
    await setTimeout(() => {
    }, delay);
  }
  return await callback();
}

/**
 * gets an array of track ids present in a playlist.slice(offset, offset+51)
 * 
 * @param {string} playlistID a playlist's id
 * @param {number} offset
 * @return {Object} data key contains array of track ids, status key contains error code
 */
const getTrackIDsInPlaylistHelper = async (playlistID, offset, retries=0) => {
	await refreshHeader();
	const api_url = `https://api.spotify.com/v1/playlists/${playlistID}/tracks?limit=50&offset=${offset}`;

	try {
		const response = await axios.get(api_url, {
			headers: currentHeaders
		});

		return {
      status: 200,
      data: response.data.items.map((item) => item.track.id ),
    }
	} catch (error) {
    return await onRateLimit(error.response, () => { return getTrackIDsInPlaylistHelper(playlistID, offset, retries+1)}, retries );
	}
};

/**
 * gets an array of track ids present in a given playlist id
 * 
 * @param {string} playlistID a playlist's id
 * @return {Object} data key contains an array of track ids, status key contains the error code
 */
const getTrackIDsInPlaylist = async (playlistID) => {
	let halves = await Promise.all([
		getTrackIDsInPlaylistHelper(playlistID, 0),
		getTrackIDsInPlaylistHelper(playlistID, 50)
	]);
  if (halves[0].status != 200 || halves[1].status != 200) {
    return {
      status: 500,
      data: null,
    }
  }
	return {
    status: 200,
    data: halves[0].data.concat(halves[1].data)
  };
};

/**
 * gets an array of audio features objects for an array of track ids
 * 
 * @param {[string]} trackIds an array of track ids
 * @return {Object} data key contains an a array of audio feature objects, status key contains error code if applicable
 */
const getTracksAudioFeatures = async (trackIDs, retries=0) => {
	await refreshHeader();
	const api_url = `https://api.spotify.com/v1/audio-features?ids=${Array.from(trackIDs).join(',')}`;

	try {
		const response = await axios.get(api_url, {
			headers: currentHeaders
		});
		return {
      status: 200,
      data: response.data['audio_features'],
    };
	} catch (error) {
    return await onRateLimit(error.response, () => { return getTracksAudioFeatures(trackIDs, retries+1); }, retries );
	}
};

/**
 * creates a public playlist using the given trackids
 * 
 * @param {string[]} trackIds an array of track ids
 * @return {string} a playlistID containing the given trackIDs
 */


export { getTrackIDsInPlaylist, getTracksAudioFeatures };
