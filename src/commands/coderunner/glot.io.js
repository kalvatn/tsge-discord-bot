import Promise from 'bluebird';
import logger from '../../util/logging';
import nconf from 'nconf';

import rp from 'request-promise';

/*
 * https://glot.io/api
 * https://github.com/prasmussen/glot-run/tree/master/api_docs
 * https://github.com/prasmussen/glot-snippets/tree/master/api_docs
 */
const API_TOKEN = nconf.get('glot:token');
const API_RUN_URL = 'https://run.glot.io';
const API_SNIPPETS_URL = 'https://snippets.glot.io';
const SNIPPET_VIEW_URL = 'https://glot.io/snippets';

let LANGUAGE_CACHE = [];

export function list_languages() {
  return new Promise((resolve, reject) => {
    if (LANGUAGE_CACHE && LANGUAGE_CACHE.length > 0) {
      return resolve(LANGUAGE_CACHE);
    }
    // logger.info('loading language list from glot.io api');
    rp(`${API_RUN_URL}/languages`)
      .then(response => {
        let data = JSON.parse(response);
        let languages = [];
        data.forEach((l) => {
          languages.push(l.name);
        });
        return resolve(languages);
      })
    .catch(error => {
      return reject(error);
    });
  });
}

export function run_code(language, code) {
  // logger.debug(`language : \'${language}\', code : \'${code}\'`);
  return new Promise((resolve, reject) => {
    let options = {
      method: 'POST',
      uri: `${API_RUN_URL}/languages/${language}/latest`,
      headers : {
        'Authorization' : `Token ${API_TOKEN}`,
        'Content-type' : 'application/json'
      },
      body: {
        files: [ { name : 'Main.java', content : code } ]
      },
      json: true
    };

    rp(options)
      .then(response => {
        // logger.debug(response);
        let data = {
          stdout : response.stdout,
          stderr : response.stderr,
          error  : response.error
        };
        create_snippet(language, code)
          .then(response => {
            data['url'] = `${SNIPPET_VIEW_URL}/${response.id}`;
            // logger.debug(data);
            return resolve(data);
          })
          .catch(error => {
            return reject(error);
          });
      })
      .catch((error) => {
        logger.error(error);
        return reject(error);
      });
  });
}

export function create_snippet(language, code, title) {
  return new Promise((resolve, reject) => {
    let options = {
      method: 'POST',
      uri: `${API_SNIPPETS_URL}/snippets`,
      headers : {
        'Authorization' : `Token ${API_TOKEN}`,
        'Content-type' : 'application/json'
      },
      body: {
        language : language,
        public: false,
        files: [ { content : code } ]
      },
      json: true
    };
    rp(options)
    .then(response => {
      // logger.debug(response);
      return resolve(response);
    })
    .catch(error => {
      logger.error(error);
      return reject(error);
    });
  });
}

export default {
  list_languages,
  run_code
};
