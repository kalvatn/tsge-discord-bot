
import Promise from 'bluebird';

function lol() {
  return new Promise((resolve) => {
    return resolve('lol');
  });
}

export const run = lol;
export const name = 'lol';
export const desc = 'lol';
export const aliases = [ 'lol' ];
export const usage = '!lol';
