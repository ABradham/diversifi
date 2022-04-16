/**
 * representation of a song's relevant features and identifying info as a node in k-d tree
 */
export default class SongNode {
  static dimensions = [
    'acousticness',
    'danceability',
    'energy',
    'instrumentalness',
    'speechiness',
    'valence',
  ];

  /**
   * @param {SongNode} s1
   * @param {SongNode} s2
   * @return {number} the Euclidean distance between s1 and s2
   */
  static distance(s1, s2) {
    return Math.sqrt(
      SongNode.dimensions
        .map((d) => (s1[d] - s2[d]) ** 2)
        .reduce((a, b) => a + b, 0),
    );
  }

  /**
   * @param {[SongNode]} nodes an array of SongNodes
   * @return {SongNode} a SongNode with the average features of all input SongNodes,
   *                    id will be nodes[0].id
   */
  static average(nodes) {
    const features = SongNode.dimensions.reduce((a, b) => ({ ...a, [b]: 0 }), {});

    features.id = nodes[0].id;

    SongNode.dimensions.forEach((d) => {
      nodes.forEach((n) => {
        features[d] += n[d];
      });
      features[d] /= nodes.length;
    });

    return new SongNode(features);
  }

  /**
  * @param {object} features JSON output from successful "Get Track's Audio Feature's" call
  */
  constructor(features) {
    Object.entries(features).forEach(([k, v]) => {
      if (SongNode.dimensions.includes(k)) {
        this[k] = v;
      }
    });
    this.id = features.id;
  }
}
