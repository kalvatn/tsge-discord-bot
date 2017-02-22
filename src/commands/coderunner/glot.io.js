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

let LANGUAGE_CACHE = [];

export function list_languages() {
  return new Promise((resolve, reject) => {
    if (LANGUAGE_CACHE && LANGUAGE_CACHE.length > 0) {
      return resolve(LANGUAGE_CACHE);
    }
    logger.info('loading language list from glot.io api');
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
  /**
   * curl
   * --request POST
   * --header 'Authorization: Token bc1f1f17-b8ea-490d-852d-b7759a6a0c42'
   * --header 'Content-type: application/json'
   * --data '{"files": [{"name": "main.py", "content": "print(42)"}]}'
   * --url 'https://run.glot.io/languages/python/latest'
   */
  logger.debug(`language : \'${language}\', code : \'${code}\'`);
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
      .then((parsedBody) => {
        logger.debug(parsedBody);
        return resolve(parsedBody);
      })
      .catch((error) => {
        logger.error(error);
        return reject(error);
      });
  });
}

export function create_snippet(content, opts) {
  return new Promise((resolve, reject) => {
    rp(`${API_SNIPPETS_URL}/snippets`, {
      language : opts.language,
      title : opts.title,
      public : opts.public,
      files : [
        {
          name : 'test',
          content : content
        }
      ]
    })
    .then(response => {
      logger.debug(response);
      return resolve('snippet created');
    })
    .catch(error => {
      reject(error);
    });
  });
}

export default {
  list_languages,
  run_code
};
