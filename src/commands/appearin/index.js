import Promise from 'bluebird';

function appearin() {
  return new Promise((resolve) => {
    return resolve('https://appear.in/' + Math.random().toString().replace('.', '').slice(0, 10));
  });
}

export const run = appearin;
export const name = 'appear.in';
export const desc = 'create videochat or screensharing session at https://appear.in';
export const aliases = [ 'appearin', 'videochat', 'screenshare' ];
export const help = '!appearin - creates a new room at https://appear.in';
