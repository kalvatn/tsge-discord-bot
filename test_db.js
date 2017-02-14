var sqlite = require('sqlite3').verbose();

// var db = new sqlite.Database(':memory:');
var db = new sqlite.Database('discord_tsge.sqlite');

db.serialize(() => {

  db.run(`CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS channel (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS stat_type (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    value_type TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS word (
    id INTEGER PRIMARY KEY,
    word TEXT NOT NULL UNIQUE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS link (
    id INTEGER PRIMARY KEY,
    url TEXT NOT NULL UNIQUE
  )`);


  db.run(`CREATE TABLE IF NOT EXISTS user_word (
    user_id INTEGER,
    word_id INTEGER,
    count INTEGER DEFAULT 1,
    PRIMARY KEY (user_id, word_id),
    FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (word_id) REFERENCES word (id) ON DELETE CASCADE ON UPDATE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_link (
    user_id INTEGER,
    link_id INTEGER,
    count INTEGER DEFAULT 1,
    PRIMARY KEY (user_id, link_id),
    FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (link_id) REFERENCES link (id) ON DELETE CASCADE ON UPDATE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_channel_message (
    id INTEGER,
    user_id INTEGER,
    channel_id INTEGER,
    contents TEXT NOT NULL,
    PRIMARY KEY (id, user_id, channel_id),
    FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (channel_id) REFERENCES channel (id) ON DELETE CASCADE ON UPDATE CASCADE
  )`);


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

  var s;

  console.log('inserting user test values');
  s = db.prepare('INSERT OR IGNORE INTO user VALUES (?, ?)');
  s.run(1, 'kalvatn');
  s.run(2, 'redrome');
  s.run(3, 'dagolap');
  s.finalize();


  console.log('inserting channel test values');
  s = db.prepare('INSERT OR IGNORE INTO channel VALUES (?, ?)');
  s.run(1, 'general');
  s.run(2, 'sjakk');
  s.run(3, 'overwatch');
  s.finalize();

  console.log('inserting stat_type test values');
  s = db.prepare('INSERT OR IGNORE INTO stat_type VALUES (?, ?, ?)');
  s.run(1, 'words', 'integer');
  s.run(2, 'lines', 'integer');
  s.run(3, 'letters', 'integer');
  s.finalize();

  console.log('inserting word test values');
  s = db.prepare(`
    INSERT OR IGNORE INTO word
    VALUES (:id, :word);
    `);
  s.run(null, 'word');
  s.run(null, 'word');
  s.run(null, 'word');
  s.run(null, 'lol');
  s.run(null, 'lol');
  s.run(null, 'hello');
  s.run(null, 'world');
  s.finalize();

  console.log('inserting link test values');
  s = db.prepare(`
    INSERT OR IGNORE INTO link
    VALUES (:id, :url)
    `);
  s.run(null, 'http://www.google.com');
  s.run(null, 'http://www.google.com');
  s.run(null, 'https://www.youtube.com/watch?v=cBkWhkAZ9ds');
  s.run(null, 'https://www.youtube.com/watch?v=cBkWhkAZ9ds');
  s.run(null, 'https://www.youtube.com/watch?v=cBkWhkAZ9ds');
  s.run(null, 'https://www.youtube.com/watch?v=cBkWhkAZ9ds');
  s.run(null, 'https://www.youtube.com/watch?v=Vvwx_woiItk');
  s.run(null, 'http://www.chess.com');
  s.run(null, 'http://www.chess.com');
  s.finalize();




  console.log('inserting user_link test values');
  s = db.prepare(`
    INSERT OR REPLACE INTO user_link
    VALUES (:user_id, :link_id,
      COALESCE( (SELECT l.count FROM user_link l WHERE l.user_id = :user_id AND l.link_id = :link_id), 0) + 1)
    `);
  s.run(1, 1);
  s.run(1, 1);
  s.run(1, 1);
  s.run(1, 2);
  s.finalize();

  console.log('inserting user_word test values');
  s = db.prepare(`
    INSERT OR REPLACE INTO user_word
    VALUES (:user_id, :word_id,
      COALESCE( (SELECT w.count FROM user_word w WHERE w.user_id = :user_id AND w.word_id = :word_id), 0) + 1)
    `);

  s.run(1, 3);
  s.run(1, 3);
  s.run(1, 5);
  s.run(1, 6);
  s.run(1, 6);
  s.run(1, 6);
  s.finalize();


  console.log('inserting user_channel_message test values');
  s = db.prepare('INSERT OR IGNORE INTO user_channel_message VALUES (?, ?, ?, ?)');
  s.run(1, 1, 1, 'hello world');
  s.run(2, 1, 1, 'hello my name is Jon Terje and I love coding');
  s.run(3, 1, 1, 'hello my name is Jon Terje and I love coding');

  s.run(4, 2, 3, 'message from user redrome in the #overwatch channel');
  s.run(5, 2, 1, 'another message from user redrome in the #general channel');

  s.run(5, 3, 1, 'this message should be from dagolap and should be stored with channel_id 1, which corresponds to the channel named #general');
  s.run(6, 3, 2, 'this message should also be from dagolap but in the #sjakk channel');

  s.finalize();

  console.log('inserting user_channel_stats test values');
  s = db.prepare('INSERT OR REPLACE INTO user_channel_stats VALUES (?, ?, ?, ?)');
  s.run(1, 1, 1, 100);
  s.run(1, 1, 2, 10);
  s.run(1, 1, 3, 500);

  s.run(2, 1, 1, 100);
  s.run(2, 1, 2, 10);
  s.run(2, 1, 3, 500);

  s.run(2, 3, 1, 10);
  s.run(2, 3, 2, 10);
  s.run(2, 3, 3, 300);

  s.finalize();


  var queries = [];

  queries.push(`SELECT * FROM user`);
  queries.push(`SELECT * FROM channel`);
  queries.push(`SELECT * FROM stat_type`);
  queries.push(`SELECT * FROM word`);
  queries.push(`SELECT * FROM link`);
  queries.push(`SELECT * FROM user_link ul JOIN link l on l.id = ul.link_id`);
  queries.push(`SELECT * FROM user_word uw JOIN word w on w.id = uw.word_id`);

  queries.push(`
  SELECT
    u.id AS user_id, u.username AS user_username
    , c.id AS channel_id, c.name AS channel_name
    , ucm.contents
  FROM user u
    JOIN user_channel_message ucm ON ucm.user_id = u.id
    JOIN channel c ON c.id = ucm.channel_id
  `);

  queries.push(`
  SELECT
    u.id AS user_id, u.username AS user_username
    , c.id AS channel_id, c.name AS channel_name
    , st.name AS stat_type_name, st.value_type as stat_type_value_type, ucs.value AS stat_value
  FROM user u
    JOIN user_channel_stats ucs ON ucs.user_id = u.id
    JOIN stat_type st ON st.id = ucs.stat_type_id
    JOIN channel c ON c.id = ucs.channel_id
  `);

  queries.forEach((q) => {
    db.all(q, (error, rows) => {
      console.log(q, 'executed');
      if (error) {
        console.error(error);
        return;
      }
      rows.forEach((row) => {
        console.log(row);
      });
    });
  });

});

db.close();
