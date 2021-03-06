import Promise from 'bluebird';

import Twitter from 'twitter';
import nconf from 'nconf';

const client = new Twitter({
  consumer_key: nconf.get('twitter:consumer_key'),
  consumer_secret: nconf.get('twitter:consumer_secret'),
  access_token_key: nconf.get('twitter:access_token_key'),
  access_token_secret: nconf.get('twitter:access_token_secret')
});


function search(args) {
  // var params = {q: 'from:realDonaldTrump', result_type : 'recent', count : 1};
  return new Promise((resolve, reject) => {
    var params = { q: args.join(' '), result_type : 'mixed', count : 5 };
    client.get('search/tweets', params, (error, tweets) => {
      if (error) {
        return reject(error);
      }
      let statuses = [];
      tweets.statuses.forEach((tweet) => {
        // statuses.push(`${tweet.text} - https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`);
        statuses.push(`https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`);
      });
      return resolve(statuses.join('\n'));
    });
  });
}


export const run = search;
export const name = 'twitter';
export const desc = 'get popular tweets';
export const aliases = [ 'twitter', 'tw' ];
export const params = {
  'query' : 'search string'
};
export const usage = '!twitter <query>';
