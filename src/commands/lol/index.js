
import Promise from 'bluebird';

function lol() {
  return new Promise((resolve, reject) => {
    return resolve('ltrololol');
  });
}

export const run = lol;
export const name = 'lol';
export const desc = '';
export const aliases = [ 'lol' ];
export const help = '!lol';
