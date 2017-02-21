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
export const name = 'shorturl';
export const desc = 'shorten url';
export const aliases = [ 'urlshort', 'shorturl', 'shortenurl', 'urlshorten' ];
export const params = {
  'url' : 'the url to shorten'
};
export const delete_command_message = true;
export const usage = '!shortenurl <url>';
