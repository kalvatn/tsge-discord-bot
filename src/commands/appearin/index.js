import Promise from 'bluebird';

function appearin() {
  return new Promise((resolve) => {
    return resolve('https://appear.in/' + Math.random().toString().replace('.', '').slice(0, 10));
  });
}

export const run = appearin;
export const name = 'appear.in';
export const desc = 'create new video/screensharing session at appear.in';
export const aliases = [ 'appearin', 'videochat', 'screenshare' ];
export const usage = '!appearin';
