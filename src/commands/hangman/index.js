import Promise from 'bluebird';
import rp from 'request-promise';

import logger from '../../util/logging';
import string from '../../util/string';

const GRAPHIC_INITIAL = [
  '  +-----+ ',
  '  |     | ',
  '  |     # ',
  '  |    # #',
  '  |     # ',
  '  |    # #',
  '__+__     '
].join('\n');

const GRAPHIC_SUCCESS = [
  '  +-----+         ',
  '  |     |         ',
  '  |               yes! :D :D :D',
  '  |        \\O\/   ',
  '  |         |     ',
  '__+__      \/ \\   '
].join('\n');


const GRAPHIC_PARTS = [ 'O', '\/', '\\', '|', '\/', '\\' ];

const LIVES = GRAPHIC_PARTS.length;
let word;
let attempts;
let wrong_letters;
let wrong_full_guesses;
let correct_letters;
let in_progress = false;

function hangman(args) {
  return new Promise((resolve, reject) => {
    let command = args[0];
    if (!command) {
      if (!in_progress) {
        command = 'new';
      } else {
        return reject(usage);
      }
    }
    command = command.trim().toLowerCase();
    let output = [];
    switch (command) {
      case 'new':
        if (in_progress) {
          output.push(show_solution());
        }
        random_word()
          .then(result => {
            new_game(result.toLowerCase());
            output.push(build_output());
            return resolve(string.markdown(output.join('\n')));
          })
          .catch(error => {
            return reject(`error starting new game, could not generate random word : ${error}`);
          });
        break;
      default:
        if (in_progress) {
          guess(command.toLowerCase());
          output.push(build_output());
        } else {
          output.push('you need to start a new game before guessing');
        }
        return resolve(string.markdown(output.join('\n')));
    }
  });
}

function new_game(new_word) {
  word = new_word;
  attempts = 0;
  wrong_letters = new Set();
  wrong_full_guesses = new Set();
  correct_letters = new Set();
  in_progress = true;
  logger.debug(`new game started, word : ${word}`);
}

function random_word() {
  return rp('http://www.setgetgo.com/randomword/get.php');
}

function guess(word_or_letter) {
  if (!in_progress) {
    return;
  }
  if (word_or_letter.length == 1) {
    if (word.indexOf(word_or_letter) >= 0) {
      correct_letters.add(word_or_letter);
    } else {
      if (!wrong_letters.has(word_or_letter)) {
        attempts += 1;
        wrong_letters.add(word_or_letter);
      }
    }
  } else {
    if (word_or_letter === word) {
      [...word_or_letter].forEach(l => {
        correct_letters.add(l);
      });
    } else {
      if (!wrong_full_guesses.has(word_or_letter)) {
        attempts += 1;
        wrong_full_guesses.add(word_or_letter);
      }
    }
  }
}


function build_output() {
  let masked = mask_word();
  let output = [];
  if (masked === word) {
    in_progress = false;
    output.push(GRAPHIC_SUCCESS);
    output.push(`\n${[...word].join(' ')}`);
  } else {
    output.push(update_hangman());
    if (wrong_letters.size > 0) {
      output.push(`wrong_letters : [ ${[...wrong_letters].sort().join(' ')} ]`);
    }
    if (wrong_full_guesses.size > 0) {
      output.push(`wrong_letters wrong_full_guesses : [ ${[...wrong_full_guesses].join(', ')} ]`);
    }
    if (attempts === LIVES) {
      output.push(`\n${[...word].join(' ')}`);
      in_progress = false;
    } else {
      output.push(`\n${[...masked].join(' ')}`);
    }
  }
  return output.join('\n');
}

function show_solution() {
  return `solution : ${[...word].join(' ')}`;
}

function update_hangman() {
  let graphic = GRAPHIC_INITIAL;
  for (let i=0; i <= attempts-1; i++) {
    graphic = graphic.replace('#', GRAPHIC_PARTS[i]);
  }
  while (graphic.indexOf('#') > -1) {
    graphic = graphic.replace('#', ' ');
  }
  return graphic;
}

function mask_word() {
  let masked = [];
  for (let i=0; i < word.length; i++) {
    let letter = word.charAt(i);
    if (correct_letters.has(letter)) {
      masked[i] = letter;
    } else {
      masked[i] = '_';
    }
  }
  return masked.join('');
}

export default hangman;
export const run = hangman;
export const desc = 'hangman';
export const aliases = [ 'hm', 'hangman' ];
export const name = 'hangman';
export const delete_command_message = true;
export const edit_replies = true;
export const usage = '!hm <new|letter|wordguess>';
