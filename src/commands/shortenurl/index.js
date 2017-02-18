import Promise from 'bluebird';
const request = Promise.promisify(require('request'));

const IS_GD_SERVICE_URL = 'https://is.gd/create.php?format=json&url=';

function shorten_url(url) {
  let query = IS_GD_SERVICE_URL + url;
  return request(query)
    .then(response => {
      let data = JSON.parse(response.body);
      return data.shorturl;
    });
}

export const run = shorten_url;
export default shorten_url;
export const name = 'shortenurl';
export const desc = 'shorten url using https://is.gd';
export const aliases = [ 'shortenurl', 'isgd', 'urlshorten', 'us' ];
export const help = '!shortenurl <url> - shortens url using https://is.gd';
