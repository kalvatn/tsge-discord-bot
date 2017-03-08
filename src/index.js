import path from 'path';
import fs from 'fs';

import logger from './util/logging';
import discord from './discord';

import string from './util/string';

import nconf from 'nconf';

const COMMAND_PREFIXES = nconf.get('discord:prefixes');
const COMMAND_ROOT = path.join(__dirname, 'commands');

const CommandCache = {};
const BotMessageCache = {};
const bot_managed_channels = new Set([
  'hangman'
]);

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
  let message_id = event.d.id;
  try {
    handle_message(user_id, channel_id, message_id, message);
  } catch (error) {
    logger.error('error handling message event', event, error);
  }
});



function handle_message(user_id, channel_id, message_id, message_contents) {
  if (!message_contents || user_id == client.id) return;


  let messageSplit = message_contents.split(' ');
  if (!messageSplit && messageSplit.length <= 0) {
    return;
  }

  let channel_name = discord.get_channel_name(channel_id);
  if (bot_managed_channels.has(channel_name)) {
    handle_special_channel_message(user_id, channel_id, message_id, message_contents);
  } else {
    if (COMMAND_PREFIXES.indexOf(messageSplit[0].charAt(0)) > -1) {
      let command = messageSplit[0].substr(1, messageSplit[0].length).trim();
      let args = messageSplit.slice(1, messageSplit.length);
      handle_command(user_id, channel_id, message_id, command, args);
    }
  }
}
function handle_special_channel_message(user_id, channel_id, message_id, message_contents) {
  let channel_name = discord.get_channel_name(channel_id);

  switch (channel_name) {
    case 'hangman':
      discord.delete_message(channel_id, message_id);
      CommandCache['hangman'].run([ message_contents ])
        .then(responses => {
          responses.forEach(response => {
            if (response.is_new) {
              discord.send_text_message(channel_id, response.text)
                .then(response => {
                  BotMessageCache['hangman'] = response.id;
                });
            } else {
              if (BotMessageCache['hangman']) {
                discord.edit_message(channel_id, BotMessageCache['hangman'], response.text);
              } else {
                discord.send_text_message(channel_id, response.text)
                  .then(response => {
                    BotMessageCache['hangman'] = response.id;
                  });
              }
            }
          });
        })
        .catch(error => {
          discord.send_text_message(channel_id, error);
        });
      break;
    default:
      break;
  }
}

function handle_command(user_id, channel_id, message_id, command, args) {
  let user_username = discord.get_username(user_id);
  let channel_name = discord.get_channel_name(channel_id);
  let target_id = channel_id;

  logger.debug(`user ${user_id} (${user_username}) in channel ${channel_id} (${channel_name}) issued command : ${command}, args : ${args}`);

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
        if (command_object.upload_files) {
          let interval = 1500;
          for (let i=0; i < result.length; i++) {
            setTimeout(() => {
              discord.upload_file(target_id, result[i]);
            }, (i+1)*interval);
          }
        } else {
          if (command_object.edit_replies) {
            let edit_message_id = BotMessageCache[command_object.name];
            if (!edit_message_id) {
              discord.send_text_message(target_id, result)
                .then(response => {
                  BotMessageCache[command_object.name] = response.id;
                })
                .catch(error => {
                  logger.error('unable to send message', error);
                });
            } else {
              // logger.debug(`will edit contents of original reply ${message_id}`);
              discord.edit_message(target_id, edit_message_id, result);
            }
          } else {
            discord.send_text_message(target_id, result);
          }
        }
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
        if (command_object.examples) {
          help += string.format('\nexamples\n');
          command_object.examples.forEach(e => {
            help += string.format('\n%s\n', e);
          });
        }
      }
    } else {
      help += string.format('%15s\t%s\n', command_object.aliases[0], command_object.desc);
    }
  }
  help += '```\n';
  discord.send_text_message(discord_id, help);
}

