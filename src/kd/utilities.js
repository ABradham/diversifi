import KDT from 'kd-tree-javascript';
import SongNode from './kd/song_node.js';
const { kdTree } = KDT;

/**
 * takes an array of spotify audio features objects, gives back a serialized KD tree
 * 
 * @param {[Object]} featuresArray an array of Spotify track audio features objects, output from
 *                                 https://developer.spotify.com/console/get-audio-features-several-tracks/
 * @return {string} a serialized kdTree of the tracks' audio features
 */
function makeSerializedKDT(featuresArray) {
  return (new kdTree(featuresArray, SongNode.distance, SongNode.dimensions)).toJSON();
}

/**
 * takes an array of spotify audio features objects, gives back a serialized KD tree
 * 
 * @param {string} serializedTree a serialized kdTree
 * @return {kdTree} a deserialized kdTree
 */
 function deserializeKDT(serializedTree) {
  return new kdTree(serializedTree, SongNode.distance, SongNode.dimensions)
}

/**
 * gets the k-nearest song ids to a user's SongNode
 * 
 * @param {string} tree a serialized kdtree returned by makeKDT or from DB
 * @param {number} k the # of nearest song ids to return
 * @param {SongNode} node the SongNode representing a user's preferred audio features
 * 
 * @return {[string]} a k-long array of the k-nearest SongNode ids to node in the tree
 */
function kNearest(tree, k, node) {
  return tree.nearest(node, k).map((x) => x[0].id);
}

/**
 * create a SongNode representing the user's preferred audio features
 * 
 * @param {[Object]} featuresArray an array of Spotify track audio features objects, output from
 *                                 https://developer.spotify.com/console/get-audio-features-several-tracks/
 * 
 * @return {SongNode} a SongNode representing the user's preferred audio features
 */
function makeUserNode(featuresArray) {
    return SongNode.average(featuresArray.map( (f) => { new SongNode(f); }));
}

export {makeSerializedKDT, deserializeKDT, kNearest, makeUserNode};
