import urban from 'urban';
import Promise from 'bluebird';

import string from '../../util/string';

function search_ud(args) {
  let phrase = args.join(' ');
  return new Promise((resolve, reject) => {
    urban(phrase).first((data) => {
      if (!data) return reject(`could not find anything for ${phrase}`);
      let df = string.format('definition : %s', data.definition);
      let ex = string.format('example    : %s', data.example);
      return resolve(string.markdown(string.format('%s\n%s', df, ex)));
      // return resolve(string.markdown(JSON.stringify(data, null, 2)));
    });
  });
}

export const run = search_ud;
export const name = 'urban';
export const desc = 'lookup phrase on UD';
export const aliases = [ 'ud', 'urbandictionary', 'urban' ];
export const usage = '!ud <phrase>';
export const params = {
  'phrase' : 'the phrase to lookup (required)'
};
