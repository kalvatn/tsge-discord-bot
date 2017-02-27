import ruterapi from './ruterapi';

import Promise from 'bluebird';
import logger from '../../util/logging';
import string from '../../util/string';


function ruter(args) {
  return new Promise((resolve, reject) => {
    if (args.indexOf('til') < 0 || args.indexOf('fra') < 0) return reject(string.markdown(usage));
    let search = args.join(' ');
    let [ from, to] = search.split('til');
    from = from.replace('fra', '').trim();
    to = to.replace('til', '').trim();
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
