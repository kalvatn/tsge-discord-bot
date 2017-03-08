import Promise from 'bluebird';
import rp from 'request-promise';

import string from '../../util/string';

const GRAPHIC_PARTS = [ 'O', '\/', '\\', '|', '\/', '\\' ];
const LIVES = GRAPHIC_PARTS.length;
const GRAPHIC_INITIAL = [
  '  +-----+ ',
  '  |     | ',
  '  |     # ',
  '  |    # #',
  '  |     # ',
  '  |    # #',
  '__+__     '
].join('\n');

const GRAPHIC_GAME_OVER = [
  '  +-----+ ',
  '  |     | ',
  '  |     O         game over!',
  '  |    \/ \\',
  '  |     | ',
  '  |    \/ \\',
  '__+__     '
].join('\n');

const GRAPHIC_SUCCESS = [
  '  +-----+         ',
  '  |     |         ',
  '  |               correct!',
  '  |        \\O\/   ',
  '  |         v      ',
  '  |         |     ',
  '__+__      \/ \\   '
].join('\n');

class Game {
  constructor(word) {
    this.word = word;
    this.attempts = 0;
    this.word_masked = this.word.replace(/\w/g, '_');
    this.solved = false;
    this.wrong_guesses = new Set();
    this.correct_letters = new Set();
    this.graphic = GRAPHIC_INITIAL;
    this.update_graphic();
  }

  printable() {
    let output = [];
    output.push(this.graphic);
    output.push(`tried [ ${[...this.wrong_guesses].join(', ')} ] tries left : ${LIVES - this.attempts}`);
    output.push([...this.word_masked].join(' '));
    if (this.attempts >= LIVES) {
      output.push([...this.word].join(' '));
    }
    return output.join('\n');
  }

  abort() {
    this.attempts = LIVES;
    this.update_graphic();
  }

  guess_and_print(word_or_letter) {
    if (this.solved || this.attempts >= LIVES) {
      throw 'game finished';
    }
    this.guess(word_or_letter);
  }

  guess(word_or_letter) {
    if (this.is_correct(word_or_letter)) {
      if (this.word_masked === this.word) {
        this.solved = true;
      }
    }
    this.update_graphic();
  }

  is_correct(word_or_letter) {
    if (this.word.indexOf(word_or_letter) > -1) {
      this.update_correct_letters([...word_or_letter]);
      return true;
    }

    if (!this.wrong_guesses.has(word_or_letter)) {
      this.wrong_guesses.add(word_or_letter);
      this.attempts += 1;
      return false;
    }
    return true;
  }

  update_correct_letters(letters) {
    for (let l of letters) {
      this.correct_letters.add(l);
    }
    this.update_mask();
  }

  update_mask() {
    let masked = [];
    for (let i=0; i < this.word.length; i++) {
      let letter = this.word.charAt(i);
      if (this.correct_letters.has(letter)) {
        masked[i] = letter;
      } else {
        masked[i] = '_';
      }
    }
    this.word_masked = masked.join('');
  }

  update_graphic() {
    if (this.solved) {
      this.graphic = GRAPHIC_SUCCESS;
      return;
    }
    if (this.attempts >= LIVES) {
      this.graphic = GRAPHIC_GAME_OVER;
      return;
    }
    let graphic = GRAPHIC_INITIAL;
    for (let i=0; i <= this.attempts-1; i++) {
      graphic = graphic.replace('#', GRAPHIC_PARTS[i]);
    }
    while (graphic.indexOf('#') > -1) {
      graphic = graphic.replace('#', ' ');
    }
    this.graphic = graphic;
  }
  is_completed() {
    return this.solved || this.attempts >= LIVES;
  }
}

let game;

function hangman(args) {
  return new Promise((resolve, reject) => {
    let command = args[0];
    if (!command) {
      if (!game) {
        command = 'new';
      } else {
        return reject(usage);
      }
    }
    command = command.trim().toLowerCase();
    let output = [];
    let should_create_new_game = false;
    switch (command) {
      case 'new':
        should_create_new_game = true;
        if (game) {
          game.abort();
          output.push({ text : string.markdown(game.printable()), is_finished : true });
        }
        break;
      default:
        if (game) {
          game.guess(command.toLowerCase());
          output.push({ text : string.markdown(game.printable()), is_new : false });
        }
        if (game.is_completed()) {
          should_create_new_game = true;
        }
    }
    if (should_create_new_game) {
      random_word()
        .then(result => {
          game = new Game(result.toLowerCase());
          output.push({ text : string.markdown(game.printable()), is_new : true });
          return resolve(output);
        })
        .catch(error => {
          return reject(`error starting new game, could not generate random word : ${error}`);
        });
    } else {
      return resolve(output);
    }
  });
}

function new_game() {
}

function random_word() {
  return rp('http://www.setgetgo.com/randomword/get.php');
}

export default hangman;
export const run = hangman;
export const desc = 'hangman';
export const aliases = [ 'hm', 'hangman' ];
export const name = 'hangman';
// export const delete_command_message = true;
// export const edit_replies = true;
export const usage = '!hm <new|letter|wordguess>';
