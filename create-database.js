
var sqlite = require('sqlite3').verbose();

var db;

db = new sqlite.cached.Database('tsge-discord.sqlite3.db');
if (db) {
  console.log('database connected', db);
}
db.serialize(() => {
  console.log('creating table user');
  db.run(`CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL
  )`);

  console.log('creating table channel');
  db.run(`CREATE TABLE IF NOT EXISTS channel (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  )`);

  console.log('creating table stat_type');
  db.run(`CREATE TABLE IF NOT EXISTS stat_type (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    value_type TEXT NOT NULL
  )`);


  console.log('inserting stat_type values');
  s = db.prepare('INSERT OR IGNORE INTO stat_type VALUES (?, ?, ?)');
  s.run(1, 'lines', 'integer');
  s.run(2, 'words', 'integer');
  s.run(3, 'letters', 'integer');
  s.finalize();

  console.log('creating table word');
  db.run(`CREATE TABLE IF NOT EXISTS word (
    id INTEGER PRIMARY KEY,
    word TEXT NOT NULL UNIQUE
  )`);

  console.log('creating table link');
  db.run(`CREATE TABLE IF NOT EXISTS link (
    id INTEGER PRIMARY KEY,
    url TEXT NOT NULL UNIQUE
  )`);

  console.log('creating table user_word');
  db.run(`CREATE TABLE IF NOT EXISTS user_word (
    user_id INTEGER,
    word_id INTEGER,
    count INTEGER DEFAULT 1,
    PRIMARY KEY (user_id, word_id),
    FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (word_id) REFERENCES word (id) ON DELETE CASCADE ON UPDATE CASCADE
  )`);

  console.log('creating table user_link');
  db.run(`CREATE TABLE IF NOT EXISTS user_link (
    user_id INTEGER,
    link_id INTEGER,
    count INTEGER DEFAULT 1,
    PRIMARY KEY (user_id, link_id),
    FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (link_id) REFERENCES link (id) ON DELETE CASCADE ON UPDATE CASCADE
  )`);

  console.log('creating table user_channel_message');
  db.run(`CREATE TABLE IF NOT EXISTS user_channel_message (
    id INTEGER,
    user_id INTEGER,
    channel_id INTEGER,
    contents TEXT NOT NULL,
    PRIMARY KEY (id, user_id, channel_id),
    FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (channel_id) REFERENCES channel (id) ON DELETE CASCADE ON UPDATE CASCADE
  )`);

  console.log('creating table user_channel_stats');
  db.run(`CREATE TABLE IF NOT EXISTS user_channel_stats (
    user_id INTEGER,
    channel_id INTEGER,
    stat_type_id INTEGER,
    value TEXT NOT NULL,
    PRIMARY KEY (user_id, channel_id, stat_type_id),
    FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (channel_id) REFERENCES channel (id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (stat_type_id) REFERENCES stat_type (id) ON DELETE CASCADE ON UPDATE CASCADE
  )`);
});
db.close();
