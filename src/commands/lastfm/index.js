import Promise from 'bluebird';
import nconf from 'nconf';
import { markdown } from '../../util/string';

const request = Promise.promisify(require('request'));

const LASTFM_METHODS = {
  'nowplaying' : 'user.getRecentTracks',
  'topalbums'  : 'user.getTopAlbums',
  'toptracks'  : 'user.getTopTracks'
};

function lastfm(username) {
  var method = 'nowplaying';
  var url = `http://ws.audioscrobbler.com/2.0/?api_key=${nconf.get('lastfm:api_key')}&format=json&user=${username}&method=${LASTFM_METHODS[method]}&limit=5`;

  return request(url)
    .then(response => {
      var data = JSON.parse(response.body);
      var last_played = data.recenttracks.track[0];
      var artist = last_played.artist['#text'];
      var album = last_played.album['#text'];
      var title = last_played.name;
      // return '```' + `${username} last played *${artist} - ${album} - ${title}*` + '```';
      return markdown(`${username} last played ${artist} - ${album} - ${title}`);
    });
}

export const run = lastfm;
export const name = 'last.fm';
export const desc = 'get last played track for last.fm user';
export const aliases = [ 'lastfm', 'np', 'lfm' ];
export const params = {
  'username' : 'last.fm username (required)'
};
export const usage = '!lastfm <username>';
