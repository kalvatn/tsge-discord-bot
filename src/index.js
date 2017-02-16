import Discord from 'discord.io';
import Promise from 'bluebird';
import path from 'path';

const request = Promise.promisify(require('request'));
import URI from 'urijs';
import nconf from 'nconf';

nconf.argv()
  .env()
  .use('memory')
  .file({ file : path.join(__dirname, '../config.json') });

import xkcd from './commands/xkcd.js';
import lastfm from './commands/lastfm.js';
import appearin from './commands/appearin.js';
import wolfram from './commands/wolfram.js';


const COMMAND_PREFIXES = nconf.get('bot:prefixes');

console.info('creating discord client');
var bot = new Discord.Client({
  token: nconf.get('bot:token'),
  autorun: nconf.get('bot:autorun')
});


bot.on('ready', (event) => {
  console.info(`logged in as ${bot.id} (${bot.username})`);
});

bot.on('message', (user_username, user_id, channel_id, message, event) => {
  var message_id = event.d.id;
  handle_message(user_id, channel_id, message_id, message);
});

bot.on('presence', (user_username, user_id, user_status, game, event) => {
});

bot.on('disconnect', function(error, error_code) {
  console.info(`disconnected due to ${error} (${error_code}), reconnecting..`);
  bot.connect();
});

function get_username(user_id) {
  if (bot.users[user_id]) {
    return bot.users[user_id].username;
  }
}

function get_channel_name(channel_id) {
  if (bot.channels[channel_id]) {
    return bot.channels[channel_id].name;
  }
}

function extract_urls(message) {
  urls = [];
  URI.withinString(message, (url) => {
    urls.push(url);
  });
  return urls;
}

function handle_command(user_id, channel_id, command, args) {
  var user_username = get_username(user_id);
  var channel_name = get_channel_name(channel_id);
  var target_id = (channel_name) ? channel_id : user_id;
  console.info(`user ${user_id} (${user_username}) in channel ${channel_id} (${channel_name}) issued command : ${command}, args : ${args}`);
  switch (command) {
    case 'tts':
      send_text_message(target_id, args.join(' '), true);
      break;
    case 'lastfm':
    case 'np':
      lastfm(args[0])
        .then(result => {
          send_text_message(target_id, result);
        });
      break;
    case 'xkcd':
      xkcd(args[0])
        .then(result => {
          send_text_message(target_id, result);
        });
      break;
    case 'videochat':
    case 'screenshare':
      appearin()
        .then(result => {
          send_text_message(target_id, result);
        });
      break;
    case 'wolfram':
    case 'wfa':
      wolfram(args.join(' '))
        .then(result => {
          send_text_message(target_id, result);
        });
      break;
    case 'help':
    case 'commands':
    default:
      send_help_message(user_id);
      break;
  }
}

function handle_message(user_id, channel_id, message_id, message_contents) {
  if (!message_contents || user_id == bot.id) return;

  var user_username = get_username(user_id);
  var channel_name = get_channel_name(channel_id);
  console.info(`${user_username} in channel ${channel_name} sent message ${message_id} : ${message_contents}`);

  var messageSplit = message_contents.split(' ');
  if (!messageSplit && messageSplit.length <= 0) {
    return;
  }

  if (COMMAND_PREFIXES.indexOf(messageSplit[0].charAt(0)) > -1) {
    var command = messageSplit[0].substr(1, messageSplit[0].length);
    var args = messageSplit.slice(1, messageSplit.length);
    handle_command(user_id, channel_id, command, args);
  }
}

function send_help_message(discord_id) {
  var help = 'available commands:\n';
  help += '\t\t!lastfm <username>\n';
  help += '\t\t!xkcd [number]\n';
  send_text_message(discord_id, help);
}

function send_text_message(discord_id, message, text_to_speech) {
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
