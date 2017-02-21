import Promise from 'bluebird';

const request = Promise.promisify(require('request'));

function xkcd(number) {
  var url = 'https://xkcd.com/info.0.json';
  if (number && number > 0) {
    url = `https://xkcd.com/${number}/info.0.json`;
  }
  return request(url)
    .then(response => {
      let data = JSON.parse(response.body);
      let title = data.safe_title;
      let img = data.img;
      let alt_text = data.alt;
      return `${title} : ${img} (${alt_text})`;
    });
}

export const run = xkcd;
export const name = 'xkcd';
export const desc = 'latest comic from XKCD';
export const aliases = [ 'xkcd' ];
export const params = {
  'number' : 'get the comic with the given number (optional)'
};
export const usage = '!xkcd [number]';
