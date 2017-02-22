import Promise from 'bluebird';
import logger from '../../util/logging';
import nconf from 'nconf';

const request = Promise.promisifyAll(require('request'));

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
    request.getAsync(`${API_RUN_URL}/languages`)
      .then(response => {
        let data = JSON.parse(response.body);
        let languages = [];
        data.forEach((l) => {
          languages.push(l.name);
        });
        return resolve(languages);
        // return resolve(string.markdown(JSON.stringify(languages)));
        // return resolve(string.markdown(languages.join('\n')));
      })
    .catch(error => {
      return reject(error);
    });
  });
}

export function run_code(language, code) {
  logger.debug(`language : \'${language}\', code : \'${code}\'`);
  return new Promise((resolve, reject) => {
    /*
     * curl
     * --request POST
     * --header 'Authorization: Token bc1f1f17-b8ea-490d-852d-b7759a6a0c42'
     * --header 'Content-type: application/json'
     * --data '{"files": [{"name": "main.py", "content": "print(42)"}]}'
     * --url 'https://run.glot.io/languages/python/latest'
     */
    // let files = [{'name':'main.py','content':'print(42)'}];
    request.postAsync('https://run.glot.io/languages/python/latest',
      {
        headers : {
          'Authorization' : `Token ${API_TOKEN}`,
          'content-type'  : 'application/json; charset=utf-8'
          // 'content-length' : code.length
        },
        data : JSON.stringify({
          files: [
            {
              name: 'main.py',
              content: 'print(42)'
            }
          ]
        })
      }
    )
    .then(response => {
      logger.debug(response.request);
      logger.debug('response', response.body);
      return resolve(response.body);
    })
    .catch(error => {
      return reject(error);
    });

  });
}

export function create_snippet(content, opts) {
  return new Promise((resolve, reject) => {
    request(`${API_SNIPPETS_URL}/snippets`, {
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
