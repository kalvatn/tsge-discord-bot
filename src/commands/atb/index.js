import Promise from 'bluebird';
import rp from 'request-promise';

import logger from '../../util/logging';
import string from '../../util/string';


export function atb(args) {
  return new Promise((resolve, reject) => {
    let search = args.join(' ');
    rp(`https://www.atb.no/xmlhttprequest.php?service=routeplannerOracle.getOracleAnswer&question=${search}`)
      .then(response => {
        logger.debug(response);
        return resolve(string.markdown(response));
      })
      .catch(error => {
        logger.error(error);
        return resolve(error);
      });
  });
}


export const run = atb;
export default atb;
export const name = 'trondheim buss';
export const desc = 'bussrutesøk trondheim';
export const aliases = [ 'atb' ];
export const params = {
  'query' : 'query for bus-oracle at ATB',
};
export const usage = '!atb <query>';
