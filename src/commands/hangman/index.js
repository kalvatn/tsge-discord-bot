import Promise from 'bluebird';
import rp from 'request-promise';

import logger from '../../util/logging';
import string from '../../util/string';

const INITIAL_HANGMAN = [
  '  +-----+ ',
  '  |     | ',
  '  |     # ',
  '  |    # #',
  '  |     # ',
  '  |    # #',
  '__+__     '
].join('\n');

const SUCCESS = [
  '  +-----+         ',
  '  |     |         ',
  '  |               yes! :D :D :D',
  '  |        \\O \/   ',
  '  |         |     ',
  '__+__      \/ \\   '
].join('\n');


let parts = [ 'O', '\/', '\\', '|', '\/', '\\' ];

const LIVES = parts.length;
let word = '';
let attempts = 0;
let wrong = new Set();
let wrong_full_guesses = new Set();
let correct = new Set();
let hangman = INITIAL_HANGMAN;
let in_progress = false;

function hm(args) {
  return new Promise((resolve, reject) => {
    let command = args[0];
    let output = [];
    switch (command.toLowerCase()) {
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
  wrong = new Set();
  wrong_full_guesses = new Set();
  correct = new Set();
  hangman = INITIAL_HANGMAN;
  hangman = update_hangman();
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
      correct.add(word_or_letter);
    } else {
      if (!wrong.has(word_or_letter)) {
        attempts += 1;
        wrong.add(word_or_letter);
      }
    }
  } else {
    if (word_or_letter === word) {
      [...word_or_letter].forEach(l => {
        correct.add(l);
      });
    } else {
      if (!wrong_full_guesses.has(word_or_letter)) {
        attempts += 1;
        wrong_full_guesses.add(word_or_letter);
      }
    }
  }
  hangman = update_hangman();
}


function build_output() {
  let masked = mask_word();
  let output = [];
  if (masked === word) {
    in_progress = false;
    output.push(SUCCESS);
    output.push(`\n${[...word].join(' ')}`);
  } else {
    output.push(hangman);
    if (wrong.size > 0) {
      output.push(`wrong : [ ${[...wrong].sort().join(' ')} ]`);
    }
    if (wrong_full_guesses.size > 0) {
      output.push(`wrong wrong_full_guesses : [ ${[...wrong_full_guesses].join(', ')} ]`);
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
  let hangman = INITIAL_HANGMAN;
  for (let i=0; i <= attempts-1; i++) {
    hangman = hangman.replace('#', parts[i]);
  }
  while (hangman.indexOf('#') > -1) {
    hangman = hangman.replace('#', ' ');
  }
  return hangman;
}

function mask_word() {
  let masked = [];
  for (let i=0; i < word.length; i++) {
    let letter = word.charAt(i);
    if (correct.has(letter)) {
      masked[i] = letter;
    } else {
      masked[i] = '_';
    }
  }
  return masked.join('');
}

export default hm;
export const run = hm;
export const desc = 'hangman';
export const aliases = [ 'hm', 'hangman' ];
export const name = 'hangman';
export const delete_command_message = false;
export const edit_replies = true;
export const usage = '!shortenurl <url>';
