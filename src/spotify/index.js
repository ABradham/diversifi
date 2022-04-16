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

const getTrackIDsInPlaylist = async (playlistID) => {
  await refreshHeader();
  const api_url = `https://api.spotify.com/v1/playlists/${playlistID}/tracks`;

  try{
    const response = await axios.get(api_url, {
      headers: currentHeaders
    });

    return response.data;

  }catch(error){
    console.log(error);
  }  
}


const main = async () => {
  let songIds = await getTrackIDsInPlaylist('4Gol1EeoMD24Bm4EoiVpnw');
  console.log(songIds);
}

main();