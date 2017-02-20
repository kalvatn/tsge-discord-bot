
export function debug(message) {
  console.log(message);
}

export function info(message) {
  console.info(message);
}

export function warn(message) {
  console.warn(message);
}

export function error(message) {
  console.error(message);
}

export default {
  debug : debug,
  info : info,
  warn : warn,
  error : error
};
