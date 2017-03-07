import logger from '../../util/logging';

let word = 'HANGMAN';
const INITIAL_HANGMAN = [
  '  +---+',
  '  |   |',
  '  |   #',
  '  |  # #',
  '  |   #',
  '  |  # #',
  '__+__'
].join('\n');


let parts = [ 'O', '\/', '\\', '|', '\/', '\\' ];

const LIVES = parts.length;
let attempts = 0;
let wrong = new Set();
let correct = new Set();
let hangman = INITIAL_HANGMAN;
let in_progress = false;

function new_game() {
  hangman = INITIAL_HANGMAN;
  in_progress = true;

  hangman = update_hangman();
  print_progress();

}

function guess(letter) {
  if (!in_progress) {
    return;
  }
  if (word.indexOf(letter) >= 0) {
    correct.add(letter);
  } else {
    if (wrong.has(letter)) {
      logger.debug('already tried', letter);
    } else {
      attempts += 1;
      wrong.add(letter);
    }
  }
  let masked = mask_word();
  hangman = update_hangman();
  print_progress();
  if (attempts === LIVES) {
    game_over();
    return;
  }
  if (masked === word) {
    game_win();
    return;
  }
}


function print_progress() {
  let masked = mask_word();
  logger.debug(hangman);
  logger.debug('guessed : [', [...wrong].sort().join(' '), ']');
  logger.debug([...masked].join(' ') + '\n');
}

function game_over() {
  in_progress = false;
  logger.debug('game over, solution : ', [...word].join(' '));
}
function game_win() {
  in_progress = false;
  logger.debug('game win');
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

export default new_game;

new_game();

guess('X');
// guess('Y');
// guess('Z');
// guess('C');
// guess('D');
// guess('E');
guess('A');
guess('N');
guess('G');
guess('M');
guess('H');
