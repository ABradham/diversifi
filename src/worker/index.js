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

	for (const [ country, playlistIDs ] of Object.entries(countriesToPlaylistIDs)) {
		const playlistsTracksIDsRes = await Promise.all(
			playlistIDs.map((playlistID) => getTrackIDsInPlaylist(playlistID))
		);
    let playlistsTracksIDs = playlistsTracksIDsRes.map((res) => {
      if (res.status != 200) {
        console.log(`Error code ${res.status} found at location 1`)
        process.exit();
      }
      return res.data;
    })
		const unique100Tracks = get100Tracks(playlistsTracksIDs);

		const tracksAudioFeaturesRes = await getTracksAudioFeatures(unique100Tracks);

    if (tracksAudioFeaturesRes.status != 200) {
      console.log(`Error code ${tracksAudioFeaturesRes.status} found at location 2`)
      process.exit();
      return;
    }

		const tree = makeSerializedKDT(tracksAudioFeaturesRes.data);

		// Delete existing country document from database
		
		let countryDocument = await CountrySchema.findOneAndDelete({ country: country })
    if(!countryDocument) {
      console.log(`CountrySchema.findOneAndDelete ${country} encountered an error at location 3`);
      process.exit();
      return;
    }
    console.log(`${country} successfully removed from DB`);

		// Create country object from schema and save to db
		const newCountry = await new CountrySchema({
			country: country,
			tree: tree
		});
		const saveRes = await newCountry.save();
    if(!saveRes) {
      console.log(`newCountry.save() ${country} encountered an error at location 4`);
      process.exit();
      return;
    }
    console.log(`${country} successfully added to DB`);
	}
  mongoose.connection.close();
};

main();
