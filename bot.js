#!/usr/bin/env node

var Discord = require('discord.io');
var http = require('http');
var https = require('https');
var request = require('request-promise');
var sqlite = require('sqlite3');

var URI = require('urijs');

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

const STAT_TYPE_LINES = 1;
const STAT_TYPE_WORDS = 2;
const STAT_TYPE_LETTERS = 3;

console.info('creating discord client');
var bot = new Discord.Client({
  token: DISCORD_BOT_TOKEN,
  autorun: !DEBUG
});

var db;

function db_connect(callback) {
  db = new sqlite.Database('tsge-discord.sqlite3.db', callback);
}



function db_create_user(user_id, user_username) {
  s = db.prepare('INSERT OR IGNORE INTO user VALUES (?, ?)');
  s.run(user_id, user_username);
  s.finalize();
}

function db_create_channel(channel_id, channel_name) {
  s = db.prepare('INSERT OR IGNORE INTO channel VALUES (?, ?)');
  s.run(channel_id, channel_name);
  s.finalize();
}


bot.on('ready', (event) => {
  // console.log('ready event ', event);
  console.info(`logged in as ${bot.id} (${bot.username})`);
  db_connect(() => {

    if (!db) {
      console.log('database not connected', db);
      return;
    }
    for (channel_id in bot.channels) {
      var channel = bot.channels[channel_id];
      db_create_channel(channel_id, channel.name);
    }
    for (user_id in bot.users) {
      var user = bot.users[user_id];
      db_create_user(user_id, user.username);
    }
  });

  // console.log('servers', bot.servers);
  // console.log('channels', bot.channels);
  // console.log('users', bot.users);
});

bot.on('message', (user_username, user_id, channel_id, message, event) => {
  // console.log('message event', event);
  var message_id = event.d.id;
  handle_message(user_id, channel_id, message_id, message);
});

bot.on('presence', (user_username, user_id, user_status, game, event) => {
  // console.log('presence event : ', event)
});

bot.on('disconnect', function(error, error_code) {
  console.info(`disconnected due to ${error} (${error_code}), reconnecting..`);
  db.close();
  bot.connect();
});

if (DEBUG) {
  //
}

function get_username(user_id) {
  return bot.users[user_id].username;
}

function get_channel_name(channel_id) {
  if (bot.channels[channel_id]) {
    return bot.channels[channel_id].name;
  }
  return null;
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
      lastfm(args, (response) => {
        response.forEach((r) => {
          send_text_message(target_id, r);
        });
      }, (error) => {
        send_text_message(target_id, error);
      });
      break;
    case 'xkcd':
      xkcd(args, (response) => {
        send_text_message(target_id, response);
      }, (error) => {
        send_text_message(target_id, error);
      });
      break;
    case 'words':
      get_top_words((response) => {
        send_text_message(target_id, response);
      }, (error) => {
        console.log(error);
      });
      break;
    case 'links':
      top_links((response) => {
        send_text_message(target_id, response);
      }, (error) => {
        console.log(error);
      });
      break;
    case 'stats':
      stats(user_id, channel_id, (response) => {
        console.log('response', response);
        send_text_message(target_id, response);
      }, (error) => {
        console.error(error);
        send_text_message(target_id, error);
      });
      break;
    case 'help':
    case 'commands':
    default:
      send_help_message(user_id);
      break;
  }
}


function db_insert_words(words) {
  var s = db.prepare('INSERT OR IGNORE INTO word VALUES (?, ?)');
  words.forEach((word) => {
    s.run(null, word);
  });
  s.finalize();
}


function db_insert_links(links) {
  console.log('db_insert_links', links);
  if (!links) {
    return;
  }
  var s = db.prepare('INSERT OR IGNORE INTO link VALUES (?, ?)');
  links.forEach((link) => {
    s.run(null, link);
  });
  s.finalize();
}

function db_insert_user_word(user_id, word, count) {
  var query = `select w.id, w.word from word w where w.word = ?`
  db.all(query, word, (error, rows) => {
    if (error) {
      console.error(query, error);
      return;
    }

    var s = db.prepare(`
      INSERT OR REPLACE INTO user_word
      VALUES (:user_id, :word_id,
        COALESCE( (SELECT w.count FROM user_word w WHERE w.user_id = :user_id AND w.word_id = :word_id), 0) + ${count})
      `);
    rows.forEach((row) => {
      s.run(user_id, row.id);
    });
    s.finalize();
  });
}

function db_insert_user_links(user_id, links) {
  if (!links) {
    return;
  }
  quoted = [];
  links.forEach((link) => {
    quoted.push(JSON.stringify(link));
  });
  var query = `select l.id, l.url from link l where l.url in (${quoted.join(',')})`
  console.log(query);
  db.all(query, (error, rows) => {
    if (error) {
      console.error(query, error);
      return;
    }

    var s = db.prepare(`
      INSERT OR REPLACE INTO user_link
      VALUES (:user_id, :link_id,
        COALESCE( (SELECT ul.count FROM user_link ul WHERE ul.user_id = :user_id AND ul.link_id = :link_id), 0) + 1)
      `);
    rows.forEach((row) => {
      console.log(row);
      s.run(user_id, row.id);
    });
    s.finalize();
  });
}


function db_insert_message(user_id, channel_id, message_id, message_contents) {
  var s = db.prepare(`INSERT INTO user_channel_message VALUES (?, ?, ?, ?)`);
  s.run(message_id, user_id, channel_id, message_contents);
  s.finalize();
}

function db_update_user_stats(user_id, channel_id, stat_type_id, value) {
  console.log(user_id, channel_id, stat_type_id, value);
  var s = db.prepare('UPDATE user_channel_stats SET value = value + ? WHERE user_id = ? AND channel_id = ? AND stat_type_id = ?');
  s.run(value, user_id, channel_id, stat_type_id, (error) => {
    if (error) {
      console.error('error', error);
      return;
    }
  });
  s.finalize()

  s = db.prepare('INSERT OR IGNORE INTO user_channel_stats VALUES (?, ?, ?, ?)');
  s.run(user_id, channel_id, stat_type_id, value, (error) => {
    if (error) {
      console.error(error);
      return;
    }
  });
  s.finalize()
}

function update_stats(user_id, channel_id, message_id, message_contents) {
  console.log('update stats', user_id, channel_id, message_id, message_contents);

  var urls = extract_urls(message_contents);

  if (urls) {
    urls.forEach((url) => {
      message_contents = message_contents.replace(url, '');
    });

    db_insert_links(urls);
    db_insert_user_links(user_id, urls);
  }


  var lines = message_contents.split('\n');
  var count_lines = 0;
  var count_chars = 0;
  var word_counts = {};
  lines.forEach((line) => {
    count_lines += 1;
    line.replace(/,/g, ' ').split(/\s/).forEach((word) => {
      count_chars += word.length;
      sanitized_word = word.replace(/[^a-zA-Z0-9\-]*/g, '');
      if (sanitized_word.length > 2) {
        if (!word_counts[sanitized_word]) {
          word_counts[sanitized_word] = 0;
        }
        word_counts[sanitized_word] += 1;
      }
    });
  });

  db_insert_words(Object.keys(word_counts));

  var total_word_count = Object.keys(word_counts).reduce((accumulator, value) => {
    return accumulator + word_counts[value];
  }, 0);
  for (word in word_counts) {
    console.log(word, word_counts[word]);
    db_insert_user_word(user_id, word, word_counts[word]);
  }
  db_insert_message(user_id, channel_id, message_id, message_contents);

  db_update_user_stats(user_id, channel_id, STAT_TYPE_LINES, count_lines);
  db_update_user_stats(user_id, channel_id, STAT_TYPE_WORDS, total_word_count);
  db_update_user_stats(user_id, channel_id, STAT_TYPE_LETTERS, count_chars);

  // console.log(count_lines, total_word_count, count_chars);

}

function get_all_words(callback, error_callback) {
  var words = [];
  db.all('select w.word from word w', (error, rows) => {
    if (error) {
      error_callback(error);
    }
    rows.forEach((row) => {
      words.push(row.word);
    });
    callback(words);
  });
}

function get_all_links(callback, error_callback) {
  var links = {};
  db.all('select l.id, l.url from link l', (error, rows) => {
    if (error) {
      error_callback(error);
    }
    rows.forEach((row) => {
      links[row.id] = row.url;
    });
    callback(links);
  });
}

function top_links(callback, error_callback) {
  links = [];
  db.all('SELECT l.url, SUM(ul.count) AS total_count FROM link l JOIN user_link ul ON ul.link_id = l.id GROUP BY l.id ORDER BY total_count DESC LIMIT 5', (error, rows) => {
    if (error) {
      error_callback('error fetching top links');
      return;
    }
    rows.forEach((row) => {
      links.push(`${row.url} (${row.total_count})`)
    });
    callback(links);
  });
}

function get_top_words(callback, error_callback) {
  words = [];
  db.all('SELECT w.word, SUM(uw.count) AS total_count FROM word w JOIN user_word uw ON uw.word_id = w.id GROUP BY w.id ORDER BY total_count DESC LIMIT 5', (error, rows) => {
    if (error) {
      error_callback('error fetching top words');
      return;
    }
    rows.forEach((row) => {
      words.push(`${row.word} (${row.total_count})`)
    });
    callback(words);
  });
}

function stats(user_id, channel_id, callback, error_callback) {
  console.log(user_id, channel_id);

  top_words = [];
  db.all('SELECT w.word, uw.count FROM user_word uw JOIN word w ON w.id = uw.word_id WHERE user_id = ? ORDER BY uw.count DESC LIMIT 5', user_id, (error, rows) => {
    if (error) {
      console.error('error fetching top words', error);
      return;
    }
    rows.forEach((row) => {
      top_words.push(`${row.word} (${row.count})`)
    });
  });
  var s = db.prepare(`
    SELECT
      u.username,
      t.name AS stat_name, ucs.value AS stat_value
    FROM user_channel_stats ucs
      JOIN stat_type t on t.id = ucs.stat_type_id
      JOIN user u on u.id = ucs.user_id
    WHERE ucs.user_id = ? AND ucs.channel_id = ?
  `);
  var response = '';
  s.all(user_id, channel_id, (error, rows) => {
    if (error) {
      console.log('error', error);
      return;
    }
    var response_lines = [];
    rows.forEach((row) => {
      response_lines.push(`${row.stat_value} ${row.stat_name}`);
    });
    var username = get_username(user_id);
    var channel_name = get_channel_name(channel_id);
    var stat_string = response_lines.join(', ');
    var topwords_string = top_words.join(', ');
    callback(`stats for ${username} in ${channel_name} : ${stat_string}, top words : ${topwords_string}`);
  });
  s.finalize();
}


function handle_message(user_id, channel_id, message_id, message_contents) {
  if (user_id == bot.id) {
    return;
  }

  var user_username = get_username(user_id);
  var channel_name = get_channel_name(channel_id);
  console.info(`${user_username} in channel ${channel_name} sent message ${message_id} : ${message_contents}`);
  db_create_user(user_id, user_username);
  db_create_channel(channel_id, channel_name);

  var messageSplit = message_contents.split(' ');
  if (!messageSplit && messageSplit.length <= 0) {
    return;
  }

  if (COMMAND_PREFIXES.indexOf(messageSplit[0].charAt(0)) > -1) {
    var command = messageSplit[0].substr(1, messageSplit[0].length);
    var args = messageSplit.slice(1, messageSplit.length);
    handle_command(user_id, channel_id, command, args);
  } else {
    // update stats
    update_stats(user_id, channel_id, message_id, message_contents);
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
  if (args.length < 1 || args.length > 2) {
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



