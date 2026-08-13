/** Keep in sync with frontend/src/data/states.ts */
export const GULF_STATES = [
  'Texas',
  'Louisiana',
  'Mississippi',
  'Alabama',
  'Florida',
];

export function isGulfState(value) {
  return GULF_STATES.includes(String(value || '').trim());
}
