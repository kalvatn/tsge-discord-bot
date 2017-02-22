import Promise from 'bluebird';
import glot from './glot.io.js';
import logger from '../../util/logging';
import string from '../../util/string';


let CACHED_LANGUAGE_LIST = [];
glot.list_languages()
  .then(languages => {
    // logger.debug(languages);
    CACHED_LANGUAGE_LIST = languages;
  });

function run_code_block(content) {
  return new Promise((resolve, reject) => {
    if (!content || content.length < 1) return reject(string.markdown(`usage : ${usage}\nexample : ${examples[0]}`));
    let language = content[0].split('\n')[0].substr(3).trim();
    logger.debug('parsed language', language);
    if (!CACHED_LANGUAGE_LIST.indexOf(language) < 0) {
      return reject(`${language} not supported by glot.io`);
    }

    let code = content.join(' ').substr(3 + language.length);
    code = code.substr(0, code.length - 3).trim();
    glot.run_code(language, code)
      .then(response => {
        let output = string.format('%s', response.stdout);
        if (response.stderr) {
          output += string.format('stderr:\n%s', response.stderr);
        }
        if (response.error) {
          output += string.format('error:\n%s', response.error);
        }
        return resolve(string.markdown(output));
      })
      .catch(error => {
        return resolve(error);
      });
  });
}

export const run = run_code_block;
export const name = 'coderunner';
export const desc = 'run code';
export const aliases = [ 'coderunner', 'glotio', 'run', 'code', 'compile' ];
export const params = {
  'code-block' : 'code to be run (required), must begin with three-backticks (\`) and the language name, see examples'
};
export const usage = '!coderunner <code-block>';
export const examples = [
  '!coderunner <three-backticks (\`)>python\nprint "hello world"\n<three-backticks (\`)>'
];
