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
    // logger.debug(`creating directory ${dir}`);
    fs.mkdirSync(dir);
  }
}

function create_and_get_dir_today() {
  let date = moment().format('YYYY-MM-DD');
  let dir = path.join(COMIC_STORAGE_ROOT, date);
  mkdir(dir);
  return dir;
}

export function get_comics() {
  return new Promise((resolve, reject) => {
    let dir = create_and_get_dir_today();
    let files = fs.readdirSync(dir);
    if (files.length > 0) {
      logger.debug('already downloaded comics for today');
      return resolve(files.map(file => {
        return path.join(dir, file);
      }));
    }
    let fetch_html = [
      get_comics_dagbladet(),
      get_comics_explosm(),
      get_comics_penny_arcade()
    ];
    Promise.all(fetch_html)
      .then(results => {
        let downloads = [];
        results.forEach(r => {
          for (let [name, url] of Object.entries(r)) {
            // logger.debug(name, url);
            downloads.push(download_image(url, name, dir));
          }
        });
        Promise.all(downloads)
          .then(filenames => {
            return resolve(filenames);
          })
          .catch(error => {
            return reject(error);
          });
      })
      .catch(error => {
        logger.error(error);
      });
  });
}

function download_image(url, name, dir) {
  return new Promise((resolve, reject) => {
    let r = request(url);
    r.on('response', (response) => {
      let ext = response.headers['content-type'].split('/')[1];
      let filename = path.join(dir, `${name}.${ext}`);
      response.pipe(fs.createWriteStream(filename)).on('close', () => {
        return resolve(filename);
      });
    });
    r.on('error', (error) => {
      return reject(error);
    });
  });
}

function get_image_nodes(html, xpath_query) {
  let document = parse5.parse(html.toString());
  let xhtml = xmlser.serializeToString(document);
  let doc = new DOMParser().parseFromString(xhtml);
  let select = xpath.useNamespaces({'x': 'http://www.w3.org/1999/xhtml'});
  let nodes = select(xpath_query, doc);
  return nodes;
}

function get_comics_dagbladet() {
  return new Promise((resolve, reject) => {
    rp('http://www.dagbladet.no/tegneserier/')
      .then(html => {
        let images = {};
        let xpath = '//x:img/@src';
        get_image_nodes(html, xpath).forEach((n) => {
          if (n.nodeValue.startsWith('serveconfig')) {
            let url = `http://www.dagbladet.no/tegneserie/${n.nodeValue}`;
            let name = url.substr(url.lastIndexOf('=') + 1, url.length).replace(/\W/,'_');
            images[name] = url;
          }
        });
        return resolve(images);
      })
      .catch(error => {
        return reject(error);
      });
  });
}

function get_comics_explosm() {
  return new Promise((resolve, reject) => {
    rp('http://explosm.net/comics/latest/')
      .then(html => {
        let images = {};
        let xpath = '//x:img[@id = "main-comic"]/@src';
        get_image_nodes(html, xpath).forEach((n) => {
          let url = `http://${n.nodeValue.substr(2)}`;
          let name = 'explosm';
          images[name] = url;
        });
        return resolve(images);
      })
      .catch(error => {
        return reject(error);
      });
  });
}

function get_comics_penny_arcade() {
  return new Promise((resolve, reject) => {
    rp('https://www.penny-arcade.com/comic')
      .then(html => {
        let images = {};
        let xpath = '//x:div[@id = "comic"]/x:div[@id = "comicFrame"]/x:img/@src';
        get_image_nodes(html, xpath).forEach((n) => {
          let url = n.nodeValue;
          let name = 'penny-arcade';
          images[name] = url;
        });
        return resolve(images);
      })
      .catch(error => {
        return reject(error);
      });
  });
}

export const run = get_comics;
export default get_comics;
export const name = 'comics';
export const desc = 'post latest comics';
export const aliases = [ 'comics', 'dbcomics', 'tegneserier' ];
export const params = {
};
export const usage = '!comics';
export const upload_files = true;


// get_comics()
//   .then(filenames => {
//     logger.info(filenames);
//   })
//   .catch(error => {
//     logger.error(error);
//   });
