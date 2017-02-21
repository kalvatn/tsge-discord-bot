'use strict';

var nconf = require('nconf');
var path = require('path');


nconf.argv()
  .env()
  .use('memory')
  .file({ file : path.join(__dirname, './config.json') });

if (process.env.NODE_ENV === 'production') {
  require('./dist');
} else {
  require('babel-register');
  require('./src');
}
