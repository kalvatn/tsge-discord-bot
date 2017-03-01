import xpath from 'xpath';
import parse5 from 'parse5';
import xmlser from 'xmlserializer';
import { DOMParser } from 'xmldom';

import request from 'request';
import rp from 'request-promise';
import fs from 'fs';
import path from 'path';
import os from 'os';
import moment from 'moment';

import logger from '../../util/logging';

const COMIC_STORAGE_ROOT = path.join(os.homedir(), 'comics');

mkdir(COMIC_STORAGE_ROOT);

function mkdir(dir) {
  if (!fs.existsSync(dir)) {
    logger.info(`creating directory ${dir}`);
    fs.mkdirSync(dir);
  }
}

function create_and_get_dir_today() {
  let date = moment().format('YYYY-MM-DD');
  let dir = path.join(COMIC_STORAGE_ROOT, date);
  mkdir(dir);
  return dir;
}

export function dagbladet_comics() {
  return new Promise((resolve, reject) => {
    let dir = create_and_get_dir_today();
    let files = fs.readdirSync(dir);
    if (files.length > 0) {
      logger.debug('already downloaded comics for today');
      return resolve(files.map(file => {
        return path.join(dir, file);
      }));
    }
    rp('http://www.dagbladet.no/tegneserie/')
      .then(response => {
        let urls = extract_images(response);
        let filenames = [];
        urls.forEach(url => {
          let name = url.substr(url.lastIndexOf('=') + 1, url.length).replace(/\W/,'_');
          let r = request(url);
          r.on('response', (response) => {
            let ext = response.headers['content-type'].split('/')[1];
            let filename = path.join(dir, `${name}.${ext}`);
            response.pipe(fs.createWriteStream(filename)).on('close', () => {
              filenames.push(filename);
              if (filenames.length >= urls.length) {
                return resolve(filenames);
              }
            });
          });
        });
        // setTimeout(() => {
        //   // console.log(filenames);
        //   return resolve(filenames);
        // }, 2000);
      })
      .catch(error => {
        return reject(error);
      });
  });
}

function extract_images(html) {
  let document = parse5.parse(html.toString());
  let xhtml = xmlser.serializeToString(document);
  let doc = new DOMParser().parseFromString(xhtml);
  let select = xpath.useNamespaces({'x': 'http://www.w3.org/1999/xhtml'});
  let nodes = select('//x:img/@src', doc);
  let comics = [];
  nodes.forEach((n) => {
    if (n.nodeValue.startsWith('serveconfig')) {
      comics.push('http://www.dagbladet.no/tegneserie/' + n.nodeValue);
    }
  });
  return comics;
}

export const run = dagbladet_comics;
export default dagbladet_comics;
export const name = 'comics';
export const desc = 'comics from dagbladet.no';
export const aliases = [ 'comics', 'dbcomics', 'tegneserier' ];
export const params = {
};
// export const delete_command_message = true;
export const usage = '!comics';
export const upload_files = true;
