
export function surround(original, surround_with) {
  return surround_with + original + surround_with;
}

export function markdown(s) {
  return surround(s, '```');
}
