import Discord from 'discord.io';
import Promise from 'bluebird';
import path from 'path';
import fs from 'fs';

const request = Promise.promisify(require('request'));
import URI from 'urijs';
import nconf from 'nconf';

nconf.argv()
  .env()
  .use('memory')
  .file({ file : path.join(__dirname, '../config.json') });

const COMMAND_PREFIXES = nconf.get('bot:prefixes');
const COMMAND_ROOT = path.join(__dirname, 'commands');

const CommandCache = {};

function reload_commands() {
  fs.readdirSync(COMMAND_ROOT).forEach((command_name) => {
    let command_path = path.join(COMMAND_ROOT, command_name, 'index.js');
    if (fs.existsSync(command_path)) {
      if (require.cache[command_path]) {
        delete require.cache[command_path];
      }
      try {
        let command = require(command_path);
        CommandCache[command_name] = command;
        console.info(`loaded command_name ${command_name}`);
      } catch (error) {
        console.error(`failed to load command_name ${command_name}`, error);
      }
    }
  });
}

reload_commands();
// CommandCache['wolframalpha'].run([ '2+2' ]).then(result => {
//   console.log(result);
// });


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
  //
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
    var command = messageSplit[0].substr(1, messageSplit[0].length).trim();
    var args = messageSplit.slice(1, messageSplit.length);
    handle_command(user_id, channel_id, message_id, command, args);
  }
}

function handle_command(user_id, channel_id, message_id, command, args) {
  var user_username = get_username(user_id);
  var channel_name = get_channel_name(channel_id);
  var target_id = (channel_name) ? channel_id : user_id;
  console.info(`user ${user_id} (${user_username}) in channel ${channel_id} (${channel_name}) issued command : ${command}, args : ${args}`);

  let found = false;
  for (let [key, command_object] of Object.entries(CommandCache)) {
    if (command_object.aliases.indexOf(command) > -1) {
      found = true;
      simulate_typing(target_id);
      command_object.run(args).then(result => {
        send_text_message(target_id, result);
        // edit_message(target_id, message_id, result);
        delete_message(target_id, message_id);
      }).catch(error => {
        console.error(error);
        send_text_message(target_id, error);
      });
    }
  }
  if (found) {
    return;
  }

  switch (command) {
    case 'tts':
      send_text_message(target_id, args.join(' '), true);
      break;
    case 'reloadcommands':
    case 'reloadcmd':
    case 'rc':
      reload_commands();
      send_text_message(target_id, 'command cache refreshed');
      break;
    // case 'clear':
    //   clear(target_id, message_id, args[0]);
    //   break;
    case 'help':
    case 'commands':
    case '?':
    default:
      send_help_message(target_id);
      break;
  }
}

function send_help_message(discord_id) {
  let help = '```\n';
  for (let [key, command_object] of Object.entries(CommandCache)) {
    console.log(command_object);
    help += command_object.help + '\n';
  }
  help += '```\n';
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

function upload_file(discord_id, filename) {
  bot.uploadFile({
    to : discord_id,
    file : filename
  }, (error, response) => {
    if (error) {
      console.error('error uploading file', error);
    }
  });
}

function simulate_typing(discord_id) {
  bot.simulateTyping(discord_id, (error, response) => {
    if (error) {
      console.error('error simulating typing', error);
    }
  });
}

function edit_message(discord_id, message_id, new_contents) {
  bot.editMessage({
    channelID : discord_id,
    messageID : message_id,
    message : new_contents
  }, (error, response) => {
    if (error) {
      console.log('error deleting message', message_id, error);
    }
  });
}


function clear(channel_id, before_message_id, limit) {
  if (!limit || limit < 2 || limit > 100) {
    console.error('no limit or 2 < limit > 100', limit);
    return;
  }
  get_messages(channel_id, before_message_id, null, limit, (messages) => {
    let message_ids = [];
    messages.forEach((message) => {
      message_ids.push(message.id);
    });

    if (message_ids.length < 2 || message_ids.length > 100) {
      console.log('too few or too many messages to delete');
      return;
    }
    message_ids = message_ids.slice(0, limit);

    delete_messages(channel_id, message_ids);
  });
}


function get_messages(channel_id, before_message_id, after_message_id, limit, callback) {
  bot.getMessages({
    channelID : channel_id,
    before : before_message_id,
    after : after_message_id,
    limit : limit
  }, (error, messages) => {
    if (error) {
      console.error('error getting messages', error);
    }
    callback(messages);
  });
}

function delete_message(channel_id, message_id) {
  bot.deleteMessage({
    channelID : channel_id,
    messageID : message_id
  }, (error, response) => {
    if (error) {
      console.log('error deleting message', message_id, error);
    }
  });
}
function delete_messages(channel_id, message_ids) {

  console.log('deleting messages', message_ids);
  bot.deleteMessages({
    channelID : channel_id,
    messageIDs : message_ids
  }, (error, response) => {
    if (error) {
      console.log('error deleting messages', message_ids, error);
    }
  });
}

