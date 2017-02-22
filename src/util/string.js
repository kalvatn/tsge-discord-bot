import URI from 'urijs';
import { sprintf } from 'sprintf-js';

export const TICKS_3 = '```';
export const TICKS_4 = '````';

export function surround(original, surround_with) {
  return surround_with + original + surround_with;
}

export function markdown(s) {
  return surround(s, string.format('%s\n', TICKS_3));
}


export function extract_urls(message) {
  let urls = Set();
  URI.withinString(message, (url) => {
    urls.add(url);
  });
  return urls;
}

export default {
  surround : surround,
  markdown : markdown,
  format : sprintf,
  extract_urls : extract_urls,
  TICKS_3,
  TICKS_4
};
