import Promise from 'bluebird';
import glot from './glot.io.js';
import logger from '../../util/logging';
import string from '../../util/string';


let CACHED_LANGUAGE_LIST = [];
glot.list_languages()
  .then(languages => {
    logger.debug(languages);
    CACHED_LANGUAGE_LIST = languages;
  });

const LANGUAGE_ALIASES = {
  'javascript' : [ 'js' ],
  'python' : [ 'py' ]
};

function run_code_block(content) {
  return new Promise((resolve, reject) => {
    if (!content || content.length < 1) return reject(string.markdown(`usage : ${usage}\nexample : ${examples[0]}`));
    let language = content[0].split('\n')[0].substr(3).trim();
    let code = content.join(' ').substr(3 + language.length);
    for (let [key, aliases] of Object.entries(LANGUAGE_ALIASES)) {
      logger.debug(language, key, aliases);
      if (aliases.indexOf(language) >= 0) {
        language = key;
        break;
      }
    }

    logger.debug(string.format('parsed language "%s"', language));
    if (CACHED_LANGUAGE_LIST.indexOf(language) < 0) {
      return reject(`${language} not supported by glot.io`);
    }

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
export const aliases = [ 'run', 'glotio', 'coderunner', 'code', 'compile' ];
export const params = {
  'code-block' : 'code to be run (required), must begin with \` \` \`<language>, see examples'
};

export const usage = '!run <code-block>';
export const examples = [
  '``````\n```python\nprint "hello world"\n',
  '``````\n```java\nclass Main {\n\tpublic static void main(String[] args) {\n\t\tSystem.out.println("Hello World");\n\t}\n}'
];
