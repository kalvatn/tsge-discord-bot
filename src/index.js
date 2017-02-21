import path from 'path';
import fs from 'fs';

import logger from './util/logging';
import discord from './discord';

import string from './util/string';

import nconf from 'nconf';

const COMMAND_PREFIXES = nconf.get('discord:prefixes');
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
        logger.info(`loaded command_name ${command_name}`);
      } catch (error) {
        logger.error(`failed to load command_name ${command_name}`, error);
      }
    }
  });
}

reload_commands();

const client = discord.client;

discord.connect();

client.on('message', (user_username, user_id, channel_id, message, event) => {
  // logger.debug(event);
  var message_id = event.d.id;
  try {
    handle_message(user_id, channel_id, message_id, message);
  } catch (error) {
    logger.error('error handling message event', event, error);
  }
});

function handle_message(user_id, channel_id, message_id, message_contents) {
  if (!message_contents || user_id == client.id) return;

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
  var user_username = discord.get_username(user_id);
  var channel_name = discord.get_channel_name(channel_id);
  var target_id = channel_id;
  logger.info(`user ${user_id} (${user_username}) in channel ${channel_id} (${channel_name}) issued command : ${command}, args : ${args}`);

  let found = false;
  for (let command_object of Object.values(CommandCache)) {
    if (command_object.aliases.indexOf(command) > -1) {
      found = true;
      if (args.indexOf('--help') > -1 || args.indexOf('-h') > -1) {
        send_help_message(target_id, command);
        return;
      }

      discord.simulate_typing(target_id);
      command_object.run(args).then(result => {
        discord.send_text_message(target_id, result);
        if (command_object.delete_command_message) {
        // edit_message(target_id, message_id, result);
          discord.delete_message(target_id, message_id);
        }
      }).catch(error => {
        logger.error(error);
        discord.send_text_message(target_id, error);
      });
    }
  }
  if (found) {
    return;
  }

  switch (command) {
    case 'tts':
      discord.send_text_message(target_id, args.join(' '), true);
      break;
    case 'reloadcommands':
    case 'reloadcmd':
    case 'rc':
      reload_commands();
      discord.send_text_message(target_id, 'command cache refreshed');
      break;
    // case 'clear':
    //   clear(target_id, message_id, args[0]);
    //   break;
    case 'help':
    case 'commands':
    default:
      send_help_message(target_id, args[0]);
      break;
  }
}

function send_help_message(discord_id, command_name) {
  let help = '```\n';
  for (let command_object of Object.values(CommandCache)) {
    if (command_name) {
      if (command_object.aliases.indexOf(command_name) > -1) {
        help += string.format('%s\n', command_object.desc);
        help += string.format('\nusage\n\t%s\n', command_object.usage);
        if (command_object.aliases.length > 1) {
          help += string.format('\naliases\n\t%s\n', command_object.aliases);
        }
        if (command_object.params) {
          help += string.format('\nparameters\n');
          for (let [key, value] of Object.entries(command_object.params)) {
            help += string.format('\t%s %50s\n', key, value);
          }
        }
      }
    } else {
      help += string.format('%15s\t%s\n', command_object.aliases[0], command_object.desc);
    }
  }
  help += '```\n';
  discord.send_text_message(discord_id, help);
}

