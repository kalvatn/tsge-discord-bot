#!/usr/bin/env node

var Discord = require('discord.io');
var http = require('http');
var https = require('https');


const DISCORD_BOT_TOKEN = '';

const LAST_FM_API_KEY = '';
const LASTFM_BASE_API_URL = 'http://ws.audioscrobbler.com/2.0/?api_key=' + LAST_FM_API_KEY + '&limit=2&format=json'

const COMMAND_PREFIXES = [ '!', '?' ];
const DEBUG = false;

console.log('creating discord client');
var bot = new Discord.Client({
  token: DISCORD_BOT_TOKEN,
  autorun: !DEBUG
});

bot.on('ready', function() {
  console.log('logged in as %s - %s\n', bot.username, bot.id);
});

bot.on('message', function(user, userID, channelID, message, e) {
  try {
    processMessage(user, userID, channelID, message);
  } catch(error) {
    console.log('error : ', error);
  }
});
bot.on('disconnect', function(errMsg, code) {
  console.log('disconnected : ', code, ' ', errMsg);
  bot.connect();
});

// bot.connect();

if (DEBUG) {
  // processMessage('kalvatn', 1, 1, '!ping', null);
  // processMessage('kalvatn', 1, 1, '!xkcd', null);
  // processMessage('kalvatn', 1, 1, '!lastfm chauney', null);
  // processMessage('kalvatn', 1, 1, '!lastfm', null);
  // processMessage('kalvatn', 1, 1, '!help chauney', null);
  // processMessage('kalvatn', 1, 1, '?help', null);
  // processMessage('kalvatn', 1, 1, '?commands', null);
  // processMessage('kalvatn', 1, 1, '?lol', null);
  // processMessage('kalvatn', 1, 1, '#lol', null);
  processMessage('kalvatn', 1, 1, '!lastfm chauney', null);

  // processMessage('kalvatn', 1, 1, '!xkcd', null);
}

function processMessage(user, userID, channelID, message) {
  if (userID == bot.id) {
    return;
  }

  var tokens = message.split(' ');
  if (!tokens && tokens.length <= 0) {
    return;
  }
  var isCommand = false;
  for (var i=0; i < COMMAND_PREFIXES.length; i++) {
    if (tokens[0].startsWith(COMMAND_PREFIXES[i])) {
      isCommand = true;
      break;
    }
  }

  if (!isCommand) {
    return;
  }

  console.log('incoming message from user %s (%d) channel %d : "%s"', user, userID, channelID, message);
  var command = tokens[0].substr(1, tokens[0].length);
  var args = tokens.slice(1, tokens.length);
  switch (command) {
    // case 'tts':
    //   // sendTTSMessage(channelID, args.join(' '));
    //   break;
    case 'ping':
    case 'alive':
      sendTextMessage(channelID, 'pong');
      break;
    // case 'list':
    //   console.log(args);
    //   if (args.length >= 1) {
    //     var limit = args[0];
    //     listMessages(channelID, limit);
    //   }
    //   break;
    case 'lastfm':
    case 'np':
      if (args.length == 1) {
        var lastfmUsername = args[0];
        lastfmNowPlaying(lastfmUsername, channelID);
      } else {
        sendHelpMessage(userID);
      }
      break;
    case 'xkcd':
      xkcdLatest(channelID);
      break;
    case 'help':
    case 'commands':
    default:
      sendHelpMessage(userID);
      break;
  }
}

function sendHelpMessage(discordID) {
  var help = 'available commands:\n';
  help += '\t\t!lastfm <username>\n';
  help += '\t\t!xkcd\n';
  sendTextMessage(discordID, help);
}

function sendTextMessage(discordID, message) {
  if (DEBUG) {
    console.log('DEBUG MODE : would have sent message "%s" to id : %d', message, discordID);
    return;
  }
  bot.sendMessage({
    to: discordID, // user/channel
    message: message
  });
}


function listMessages(discordID, limit) {
  bot.getMessages({
    channelID: discordID,
    limit: limit
  }, function(error, messages) {
    if (error) {
      console.log('error : ', error);
    } else {
      var filtered = messages.slice(0, limit);
      filtered.forEach(m => {
        console.log('message %d : "%s"', m.id, m.content);
        sendTextMessage(discordID, m.id + ' ' + m.content);
      });
      // deleteMessage(filtered[0].id);
    }
  });

}

function deleteMessage(discordID, messageID) {
  sendTextMessage(discordID, 'deleting message ' + messageID + ' from channel ' + discordID);
  bot.deleteMessage({
    channelID: discordID,
    messageID: messageID
  }, function(error, response) {
    console.log('error : ', error, ' response : ', response);
  });

}

function sendTTSMessage(discordID, message) {

  if (DEBUG) {
    console.log('DEBUG MODE : would have sent TTS message "%s" to id : %d', message, discordID);
    return;
  }
  bot.sendMessage({
    to: discordID,
    message: message,
    tts: true
  });

}

function httpGET(url, callback) {
  http.get(url, function(response) {
    processHTTPResponse(response, callback);
  }).on('error', function(error) {
    console.log('error: ', error);
  });
}

function httpsGET(url, callback) {
  https.get(url, function(response) {
    processHTTPResponse(response, callback);
  }).on('error', function(error) {
    console.log('error: ', error);
  });
}

function processHTTPResponse(response, callback) {
  var responseBody = '';
  response.on('data', function(chunk) {
    responseBody += chunk;
  });

  response.on('end', function() {
    callback(responseBody);
  });
}

function readUrl(url, callback) {
  if (url.startsWith('https')) {
    httpsGET(url, callback);
  } else {
    httpGET(url, callback);
  }
}
function readJSON(url, callback) {
  readUrl(url, function(data) {
    var jsonData = JSON.parse(data);
    callback(jsonData);
  });
}

function xkcdLatest(channelID) {
  var url = 'https://xkcd.com/info.0.json';
  readJSON(url, function(data) {
    var message = data.safe_title + ' - ' + data.img + ' - ' + data.alt;
    sendTextMessage(channelID, message);
  });

}

function lastfmNowPlaying(username, channelID) {
  var url = LASTFM_BASE_API_URL + '&user=' + username + '&method=user.getRecentTracks';
  readJSON(url, function(data) {
    if (data.recenttracks) {
      var last = data.recenttracks.track[0]
      if (last) {
        var response = last.artist['#text'] + ' - ' + last.album['#text'] + ' - ' + last.name;
        sendTextMessage(channelID, response);
      } else {
        sendTextMessage(channelID, 'no last tracks for user ' + username);
      }
    } else {
      sendTextMessage(channelID, 'invalid user');
    }
  });
}
