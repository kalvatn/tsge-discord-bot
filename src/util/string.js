import URI from 'urijs';
import { sprintf } from 'sprintf-js';

export function surround(original, surround_with) {
  return surround_with + original + surround_with;
}

export function markdown(s) {
  return surround(s, '```');
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
  extract_urls : extract_urls
};
