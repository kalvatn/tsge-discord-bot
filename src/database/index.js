

import sqlite from 'sqlite3';

const STAT_TYPE_LINES = 1;
const STAT_TYPE_WORDS = 2;
const STAT_TYPE_LETTERS = 3;

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
