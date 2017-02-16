import Promise from 'bluebird';

function appearin() {
  return new Promise((resolve, reject) => {
    return resolve('https://appear.in/' + Math.random().toString().replace('.', '').slice(0, 10));
  });
}

export default appearin;
