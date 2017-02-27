import ruterapi from './ruterapi';

import Promise from 'bluebird';
import logger from '../../util/logging';
import string from '../../util/string';


function ruter(args) {
  let search = args.join(' ');
  let [ from, to] = search.split('til');
  from = from.replace('fra', '').trim();
  to = to.replace('til', '').trim();
  return new Promise((resolve, reject) => {
    ruterapi.get_travels_formatted(from, to)
    .then(result => {
      logger.debug(result);
      return resolve(string.markdown(result.join('\n')));
    })
    .catch(error => {
      return reject(error);
    });
  });
}

export const run = ruter;
export default ruter;
export const name = 'oslobuss';
export const desc = 'bussrutesøk oslo';
export const aliases = [ 'buss', 'ruter' ];
export const params = {
  'fra' : 'reis fra stopp',
  'til' : 'reis til stopp'
};
export const delete_command_message = true;
export const usage = '!buss fra <stopp> til <stopp>';
