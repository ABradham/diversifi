import axios from 'axios';
import 'dotenv/config';

const getAuthToken = async () => {
	var token = null;
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
					token = null;
				}
			},
			(error) => {
				// If error with request
				console.log(error);
				token = null;
			}
		);

	return token;
};

const getTrackIDsPerPlaylist = async () => {
	const token = await getAuthToken();
	console.log(token);
};

getTrackIDsPerPlaylist();
