export const LIMITS = {
  email: { min: 3, max: 254 },
  password: { min: 8, max: 128 },
  fullName: { min: 2, max: 100 },
  skills: { min: 3, max: 2000 },
  title: { min: 3, max: 120 },
  description: { min: 10, max: 4000 },
  skillsNeeded: { min: 3, max: 1000 },
  chatMessage: { min: 1, max: 500 },
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URGENCIES = new Set(['critical', 'high', 'moderate', 'low']);

export function trim(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function required(label: string, value: string): string | null {
  if (!value.trim()) return `${label} is required.`;
  return null;
}

export function lengthBetween(
  label: string,
  value: string,
  min: number,
  max: number
): string | null {
  const len = value.trim().length;
  if (len < min) return `${label} must be at least ${min} characters.`;
  if (len > max) return `${label} must be at most ${max} characters.`;
  return null;
}

export function validateEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return (
    required('Email', email) ||
    lengthBetween('Email', email, LIMITS.email.min, LIMITS.email.max) ||
    (!EMAIL_RE.test(email) ? 'Enter a valid email address.' : null)
  );
}

export function validatePassword(value: string): string | null {
  return (
    required('Password', value) ||
    lengthBetween('Password', value, LIMITS.password.min, LIMITS.password.max)
  );
}

export function validateFullName(value: string): string | null {
  return (
    required('Full name', value) ||
    lengthBetween('Full name', value, LIMITS.fullName.min, LIMITS.fullName.max)
  );
}

export function validateSkills(
  skills: string[],
  { required: isRequired = true } = {}
): string | null {
  if (!skills.length) {
    return isRequired ? 'Select at least one skill from the catalog.' : null;
  }
  if (skills.length > 20) return 'Select at most 20 skills.';
  return null;
}

export function validateTitle(value: string): string | null {
  return (
    required('Title', value) ||
    lengthBetween('Title', value, LIMITS.title.min, LIMITS.title.max)
  );
}

export function validateDescription(value: string): string | null {
  return (
    required('Description', value) ||
    lengthBetween('Description', value, LIMITS.description.min, LIMITS.description.max)
  );
}

export function validateSkillsNeeded(skills: string[]): string | null {
  if (!skills.length) return 'Select at least one skill needed from the catalog.';
  if (skills.length > 20) return 'Select at most 20 skills.';
  return null;
}

export function validateUrgency(value: string): string | null {
  if (!URGENCIES.has(value)) return 'Choose a valid urgency level.';
  return null;
}

const GULF_STATE_SET = new Set([
  'Texas',
  'Louisiana',
  'Mississippi',
  'Alabama',
  'Florida',
]);

export function validateState(value: string): string | null {
  if (!value.trim()) return 'Select a state for this need.';
  if (!GULF_STATE_SET.has(value)) return 'Choose a Gulf Coast sample state.';
  return null;
}

export function validateChatMessage(value: string): string | null {
  return (
    required('Message', value) ||
    lengthBetween('Message', value, LIMITS.chatMessage.min, LIMITS.chatMessage.max)
  );
}

export function firstError(...errors: Array<string | null>): string | null {
  return errors.find(Boolean) ?? null;
}
