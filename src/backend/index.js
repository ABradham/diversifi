import { deserializeKDT, kNearest } from '../kd/utilities.js';
import SongNode from '../kd/song_node.js';
import {getTracksAudioFeatures} from '../spotify/index.js'

const k = 5;



const main = async (trackIDs, country) => {
  let tracksAudioFeatures = await getTracksAudioFeatures(trackIDs);
  let nodes = tracksAudioFeatures.map( id => SongNode(id));
  let avg = SongNode.average(nodes);
  let serializedTree = MONGO[country]// GET FROM MONGODB HERE;
  let tree = deserializeKDT(serializedTree);
  let knn = kNearest(tree, k, avg);
  // MAKE SPOTIFY PLAYLIST USING KNN
  
}

main()
