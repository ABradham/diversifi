import { makeSerializedKDT /*deserializeKDT, kNearest*/ } from '../kd/utilities.js';
// import SongNode from '../kd/song_node.js';
import { getTrackIDsInPlaylist, getTracksAudioFeatures } from '../spotify/index.js';
import mongoose from 'mongoose';
import CountrySchema from '../mongo/models/country.js';
import fs from 'fs';

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
	// Connect to mongodb
	mongoose.connect(process.env.MONGO_URI, () => {
		console.log('Connected to mongodb');
	});

	let rawdata = fs.readFileSync('src/scraping/fullsScrape.json');
	let countriesToPlaylistIDs = JSON.parse(rawdata);

	for (const [ country, playlistIDs ] of Object.entries(countriesToPlaylistIDs).splice(3)) {
		const trackIDsPerPlaylist = await Promise.all(
			playlistIDs.map((playlistID) => getTrackIDsInPlaylist(playlistID))
		);

		const unique100Tracks = get100Tracks(trackIDsPerPlaylist);

		const unique100AudioFeatures = await getTracksAudioFeatures(unique100Tracks);

		const tree = makeSerializedKDT(unique100AudioFeatures);

		// Delete existing country document from database
		try {
			CountrySchema.findOneAndDelete({ country: country }, (err) => {
				console.log(`----------Error deleting ${country} from database----------`);
			});
		} catch (error) {
			console.log(`----------Error deleting ${country} document from mongo----------`);
		}

		// Create country object from schema and save to db
		try {
			const newCountry = await new CountrySchema({
				country: country,
				tree: tree
			});
			console.log('Got here!');
			await newCountry.save();
		} catch (error) {
			console.log(`Error saving ${country} to database!`);
			console.log(error);
		}

		/* TEST CODE
    const newTree = deserializeKDT(tree);
    const s1 = new SongNode(unique100AudioFeatures[0]);
    const nearest = kNearest(newTree, 1, s1);
    console.log(country);
    console.log(nearest);
    console.log(s1.id)
    */
	}
};

main();
