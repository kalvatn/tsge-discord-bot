import Discord from 'discord.io';
import nconf from 'nconf';

import logger from '../util/logging';

logger.debug('discord token ' + nconf.get('discord:token'));

let CONNECTED = false;
const RECONNECT_INTERVAL_MILLIS = 10000;
const MAX_RETRIES = 3;
let retry_count = 0;

logger.info('creating discord client');
const client = new Discord.Client({
  token: nconf.get('discord:token'),
  autorun: false
});

client.on('ready', (event) => {
  CONNECTED = true;
  logger.info(`${event.t} : logged in as ${client.id} (${client.username})`);
});

client.on('presence', (user_username, user_id, user_status, game, event) => {
  // logger.debug(event);
  logger.debug(`${event.t} : user ${user_username} (${user_id} changed status to ${user_status}, game : ${game}`);
});

client.on('disconnect', function(error, error_code) {
  CONNECTED = false;
  if (error_code < 2000) {
    reconnect(3000);
    return;
  }
  logger.info(`disconnected due to ${error} (${error_code})`);
  reconnect(RECONNECT_INTERVAL_MILLIS);
});

export function connect() {
  if (CONNECTED) {
    return;
  }
  logger.info('connecting..');
  client.connect();
  setTimeout(() => {
    if (!CONNECTED) {
      if (retry_count >= MAX_RETRIES) {
        logger.error(`exceeded ${MAX_RETRIES} attempts..`);
      } else {
        retry_count += 1;
        logger.warn(`failed to connect.. attempts : ${retry_count}`);
        reconnect(RECONNECT_INTERVAL_MILLIS);
      }
    } else {
      retry_count = 0;
    }
  }, 1000);
}

function reconnect(delay) {
  if (delay > 1000) {
    logger.info(`reconnecting in ${delay / 1000} seconds ..`);
  }
  setTimeout(() => {
    connect();
  }, delay);
}

export function is_connected() {
  return CONNECTED;
}

export function get_username(user_id) {
  if (client.users[user_id]) {
    return client.users[user_id].username;
  }
}

export function get_channel_name(channel_id) {
  if (client.channels[channel_id]) {
    return client.channels[channel_id].name;
  }
}

export function send_text_message(discord_id, message, text_to_speech) {
  client.sendMessage({
    to: discord_id,
    message: message,
    tts: (text_to_speech) ? true : false
  }, (error) => {
    if (error) {
      logger.error('error sending text message', message, error);
    }
  });
}

export function upload_file(discord_id, filename) {
  client.uploadFile({
    to : discord_id,
    file : filename
  }, (error) => {
    if (error) {
      logger.error('error uploading file', filename, error);
    }
  });
}

export function simulate_typing(discord_id) {
  client.simulateTyping(discord_id, (error) => {
    if (error) {
      logger.error('error simulating typing', error);
    }
  });
}

export function edit_message(discord_id, message_id, new_contents) {
  client.editMessage({
    channelID : discord_id,
    messageID : message_id,
    message : new_contents
  }, (error) => {
    if (error) {
      logger.debug('error deleting message', message_id, error);
    }
  });
}


export function clear(channel_id, before_message_id, limit) {
  if (!limit || limit < 2 || limit > 100) {
    logger.error('no limit or 2 < limit > 100', limit);
    return;
  }
  get_messages(channel_id, before_message_id, null, limit, (messages) => {
    let message_ids = [];
    messages.forEach((message) => {
      message_ids.push(message.id);
    });

    if (message_ids.length < 2 || message_ids.length > 100) {
      logger.debug('too few or too many messages to delete');
      return;
    }
    message_ids = message_ids.slice(0, limit);

    delete_messages(channel_id, message_ids);
  });
}


export function get_messages(channel_id, before_message_id, after_message_id, limit, callback) {
  client.getMessages({
    channelID : channel_id,
    before : before_message_id,
    after : after_message_id,
    limit : limit
  }, (error, messages) => {
    if (error) {
      logger.error('error getting messages', error);
    }
    callback(messages);
  });
}

export function delete_message(channel_id, message_id) {
  client.deleteMessage({
    channelID : channel_id,
    messageID : message_id
  }, (error, response) => {
    if (error) {
      logger.debug('error deleting message', message_id, error);
    }
    logger.debug(response);
  });
}

export function delete_messages(channel_id, message_ids) {
  logger.debug('deleting messages', message_ids);
  client.deleteMessages({
    channelID : channel_id,
    messageIDs : message_ids
  }, (error, response) => {
    if (error) {
      logger.debug('error deleting messages', message_ids, error);
    }
    logger.debug(response);
  });
}

export default {
  client : client,
  connect : connect,
  send_text_message : send_text_message,
  delete_message : delete_message,
  simulate_typing : simulate_typing,
  get_username : get_username,
  get_channel_name : get_channel_name
};
