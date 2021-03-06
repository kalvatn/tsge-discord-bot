import nconf from 'nconf';
import Promise from 'bluebird';
import wolframalpha from 'wolfram-alpha';

const client = wolframalpha.createClient(nconf.get('wolfram:app_id'));

function run_query(query) {
  return new Promise((resolve, reject) => {
    client.query(query, (error, results) => {
      if (error) return reject(error);
      return resolve(results);
    });
  });
}

function wolfram(query) {
  if (query instanceof Array) {
    query = query.join(' ');
  }
  return run_query(query)
    .then(data => {
      let input = data[0].subpods[0].image;
      let result = data[1].subpods[0].image;
      return `${input}\n${result}`;
    });
}

export const run = wolfram;
export const name = 'wolframalpha';
export const desc = 'query WolframAlpha';
export const aliases = [ 'wolframalpha', 'wfa', 'wolfa' ];
export const params = {
  'query' : 'query string (required), see https://www.wolframalpha.com/examples/'
};
export const usage = '!wfa <query>';
