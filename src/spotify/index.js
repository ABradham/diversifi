import axios from 'axios';
import 'dotenv/config';

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
  if (!currentHeaders || expiry < Date.now() + (15 * 60 * 1000)) {
    let data = await getAuthToken();
    currentHeaders = {
      Authorization: `Bearer ${data.access_token}`
    };
    expiry = Date.now() + (60 * 60 * 1000);
  }
};

const getTrackIDsInPlaylistHelper = async (playlistID, offset) => {
  await refreshHeader();
  const api_url = `https://api.spotify.com/v1/playlists/${playlistID}/tracks?limit=50&offset=${offset}`;

  try{
    const response = await axios.get(api_url, {
      headers: currentHeaders
    });

    return response.data.items.map( (item) => { return item.track.id});

  } catch(error){
    console.log(error);
  }  
};

const getTrackIDsInPlaylist = async (playlistID) => {
  let halves = await Promise.all([
    getTrackIDsInPlaylistHelper(playlistID, 0),
    getTrackIDsInPlaylistHelper(playlistID, 50)
  ]);
  return halves[0].concat(halves[1]);
}


const main = async () => {
  let country = 'Albania';
  let playlists = [ '4Gol1EeoMD24Bm4EoiVpnw', '05tRphjiIyK7HDcZCCTgjs' ]

  let trackIDsPerPlaylist = await Promise.all(playlists.map(playlist => getTrackIDsInPlaylist(playlist)));

  let uniqueTrackIds = new Set();

  trackIDsPerPlaylist.forEach((playlist) => {
    playlistHalves.forEach((half) => {
      half.forEach((trackID) => {
        uniqueTrackIds.add(trackID)
      })
    })
  }
}

main();