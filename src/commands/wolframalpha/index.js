import nconf from 'nconf';
import Promise from 'bluebird';
import R from 'ramda';

import wolframalpha from 'wolfram-alpha';


function run_query(query) {
  const client = wolframalpha.createClient(nconf.get('wolfram:app_id'));
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
      return `${input} -> ${result}`
    });
    // .then(R.nth(1))
    // .tap(data => {
    //   if (!data) throw new Error('no results found');
    // })
    // .then(R.prop('subpods'))
    // .then(R.nth(0))
    // .then(R.prop('image'));
}

export const run = wolfram;
export const name = 'wolframalpha';
export const desc = 'query https://www.wolframalpha.com';
export const aliases = [ 'wolframalpha', 'wfa', 'wolf' ];
