/** Gulf Coast sample states for the POC */
export const GULF_STATES = [
  'Texas',
  'Louisiana',
  'Mississippi',
  'Alabama',
  'Florida',
] as const;

export type GulfState = (typeof GULF_STATES)[number];

export function isGulfState(value: string): value is GulfState {
  return (GULF_STATES as readonly string[]).includes(value);
}
