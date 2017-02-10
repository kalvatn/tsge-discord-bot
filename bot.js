#!/usr/bin/env node

var Discord = require('discord.io');
var http = require('http');
var https = require('https');
var request = require('request-promise');


const DISCORD_BOT_TOKEN = '';

const LASTFM_API_KEY = '';
const LASTFM_BASE_API_URL = 'http://ws.audioscrobbler.com/2.0/?api_key=' + LASTFM_API_KEY + '&format=json'

const LASTFM_METHODS = {
  'nowplaying' : 'user.getRecentTracks',
  'topalbums'  : 'user.getTopAlbums',
  'toptracks'  : 'user.getTopTracks'
}

const COMMAND_PREFIXES = [ '!', '?' ];
const DEBUG = false;




console.info('creating discord client');
var bot = new Discord.Client({
  token: DISCORD_BOT_TOKEN,
  autorun: !DEBUG
});

bot.on('ready', function() {
  console.info(`logged in as ${bot.id} (${bot.username})`);
});

bot.on('message', function(username, user_id, channel_id, message, e) {
  handle_message(username, user_id, channel_id, message);
});

bot.on('disconnect', function(error, error_code) {
  console.warn(`disconnected due to ${error} (${error_code}), reconnecting..`);
  bot.connect();
});

if (DEBUG) {
  handle_message('kalvatn', 1, 1, '!lastfm chauney', null);
  handle_message('kalvatn', 1, 1, '!xkcd 1', null);
  handle_message('kalvatn', 1, 1, '!xkcd', null);
  handle_message('kalvatn', 1, 1, '!tts hello world', null);
  handle_message('kalvatn', 1, 1, '!lastfm chauney nowplaying', null);
  handle_message('kalvatn', 1, 1, '!lastfm chauney topalbums', null);
  handle_message('kalvatn', 1, 1, '!lastfm chauney toptracks', null);
}

function handle_message(user, user_id, channel_id, message) {
  if (user_id == bot.id) {
    return;
  }

  var messageSplit = message.split(' ');
  if (!messageSplit && messageSplit.length <= 0) {
    return;
  }

  if (COMMAND_PREFIXES.indexOf(messageSplit[0].charAt(0)) < 0) {
    return;
  }

  console.info(`received command from user ${user_id} (${user}) in channel ${channel_id} : '${message}'`);
  var command = messageSplit[0].substr(1, messageSplit[0].length);
  var args = messageSplit.slice(1, messageSplit.length);
  switch (command) {
    case 'tts':
      send_text_message(channel_id, args.join(' '), true);
      break;
    case 'lastfm':
    case 'np':
      lastfm(args, (response) => {
        response.forEach((r) => {
          send_text_message(channel_id, r);
        });
      }, (error) => {
        send_text_message(channel_id, error);
      });
      break;
    case 'xkcd':
      xkcd(args, (response) => {
        send_text_message(channel_id, response);
      }, (error) => {
        send_text_message(channel_id, error);
      });
      break;
    case 'help':
    case 'commands':
    default:
      send_help_message(user_id);
      break;
  }
}

function send_help_message(discord_id) {
  var help = 'available commands:\n';
  help += '\t\t!lastfm <username> [nowplaying|topalbums]\n';
  help += '\t\t!xkcd [number]\n';
  send_text_message(discord_id, help);
}

function send_text_message(discord_id, message, text_to_speech) {
  if (DEBUG) {
    console.log(`DEBUG MODE : would have sent ${(text_to_speech) ? 'text-to-speech' : 'text'} message '${message}'`);
    return;
  }
  bot.sendMessage({
    to: discord_id,
    message: message,
    tts: (text_to_speech) ? true : false
  }, (error, response) => {
    if (error) {
      console.error('error : ', error);
    }
  });
}

function get_json(url, callback, error_callback) {
  request(url)
    .then((data) => {
      callback(JSON.parse(data));
    })
    .catch((error) => {
      error_callback(error);
    });
}

function lastfm(args, callback, error_callback) {
  if (1 < args.length > 2) {
    error_callback('usage: !lastfm <username> [nowplaying|topalbums|toptracks]');
    return;
  }
  var username = args[0];
  if (args[1] && !LASTFM_METHODS[args[1]]) {
    error_callback('usage: !lastfm <username> [nowplaying|topalbums|toptracks]');
    return;
  }
  var method = (args[1]) ? args[1] : 'nowplaying';
  var url = `${LASTFM_BASE_API_URL}&user=${username}&method=${LASTFM_METHODS[method]}&limit=5`;

  get_json(url, (data) => {
    switch (method) {
      case 'nowplaying':
        if (data.recenttracks) {
          var last_played = data.recenttracks.track[0];
          if (last_played) {
            var artist = last_played.artist['#text'];
            var album = last_played.album['#text'];
            var title = last_played.name;
            callback([`${artist} - ${album} - ${title}`]);
          } else {
            error_callback(`no last_played tracks for user ${username}`);
          }
        } else {
          error_callback(`could not fetch last played for user ${username}`);
        }
        break;
      case 'topalbums':
        if (data.topalbums) {
          var albums = data.topalbums.album.slice(0, 10);

          var reply = [];

          albums.forEach((album) => {
            var artist = album.artist.name;
            var name = album.name;
            var playcount = album.playcount;

            reply.push(`${artist} - ${name}`);
          });
          callback(reply);
        } else {
          error_callback('could not fetch top albums for user ${username}');
        }
        break;
      case 'toptracks':
        if (data.toptracks) {
          var tracks = data.toptracks.track.slice(0, 10);
          var reply = [];

          tracks.forEach((track) => {
            var artist = track.artist.name;
            var name = track.name;
            var playcount = track.playcount;

            reply.push(`${artist} - ${name}`);
          });
          callback(reply);
        } else {
          error_callback(`could not fetch top tracks for user ${username}`);
        }
        break;
      default:
        error_callback(`unsupported lastfm api method '${method}', available choices are : nowplaying, topalbums, toptracks`);
        break;
    }
  }, (error) => {
    error_callback(error);
  });
}

function xkcd(args, callback, error_callback) {
  var url = 'https://xkcd.com/info.0.json';
  if (args.length == 1 && args[0] > 0) {
    url = `https://xkcd.com/${args[0]}/info.0.json`;
  }
  get_json(url, (data) => {
    var title = data.safe_title;
    var img = data.img;
    var alt_text = data.alt;
    callback(`${title} : ${img} (${alt_text})`);
  }, (error) => {
    error_callback(error);
  });
}

