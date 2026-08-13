/**
 * Controlled skill vocabulary for the POC.
 * Volunteers pick from these; chat suggestions are limited to this set.
 */
export const SKILL_FIELDS = [
  {
    id: 'debris_construction',
    label: 'Debris & construction',
    skills: [
      'Chainsaw operation',
      'Debris removal',
      'Roof tarping',
      'Basic carpentry',
      'Heavy lifting',
    ],
  },
  {
    id: 'medical_care',
    label: 'Medical & care',
    skills: [
      'EMT / first aid',
      'Nursing support',
      'Medical intake',
      'Mental health support',
      'Elder care',
    ],
  },
  {
    id: 'language_comms',
    label: 'Language & communication',
    skills: [
      'Spanish interpretation',
      'French interpretation',
      'Vietnamese interpretation',
      'Phone triage',
      'Family intake forms',
    ],
  },
  {
    id: 'logistics_supply',
    label: 'Logistics & supply',
    skills: [
      'Supply distribution',
      'Warehouse sorting',
      'Inventory tracking',
      'Shelter setup',
      'Food service',
    ],
  },
  {
    id: 'vehicles_equipment',
    label: 'Vehicles & equipment',
    skills: [
      'Pickup truck',
      'Passenger van',
      'Boat operation',
      'Forklift',
      'Generator setup',
    ],
  },
  {
    id: 'general_support',
    label: 'General support',
    skills: [
      'General volunteering',
      'Childcare support',
      'Pet care',
      'Cleanup crew',
      'Community outreach',
    ],
  },
];

export const ALL_SKILLS = SKILL_FIELDS.flatMap((field) => field.skills);

const SKILL_SET = new Set(ALL_SKILLS.map((s) => s.toLowerCase()));
const SKILL_BY_LOWER = new Map(ALL_SKILLS.map((s) => [s.toLowerCase(), s]));

export const SKILL_DELIMITER = ' | ';

export function isKnownSkill(skill) {
  return SKILL_SET.has(String(skill || '').trim().toLowerCase());
}

export function canonicalizeSkill(skill) {
  return SKILL_BY_LOWER.get(String(skill || '').trim().toLowerCase()) || null;
}

/** Parse stored skills string into canonical labels (drops unknowns). */
export function parseSkills(value) {
  if (!value) return [];
  const parts = String(value)
    .split(/\s*\|\s*|\s*,\s*/)
    .map((p) => p.trim())
    .filter(Boolean);

  const seen = new Set();
  const result = [];
  for (const part of parts) {
    const canonical = canonicalizeSkill(part);
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      result.push(canonical);
    }
  }
  return result;
}

/** Validate and serialize an array of skill labels. */
export function serializeSkills(skills) {
  const list = Array.isArray(skills) ? skills : parseSkills(skills);
  const canonical = [];
  const seen = new Set();
  for (const skill of list) {
    const c = canonicalizeSkill(skill);
    if (!c) {
      throw new Error(`Unknown skill: ${skill}`);
    }
    if (!seen.has(c)) {
      seen.add(c);
      canonical.push(c);
    }
  }
  return canonical.length ? canonical.join(SKILL_DELIMITER) : null;
}

export function filterSuggestedSkills(suggestions) {
  const seen = new Set();
  const result = [];
  for (const raw of suggestions || []) {
    const c = canonicalizeSkill(raw);
    if (c && !seen.has(c)) {
      seen.add(c);
      result.push(c);
    }
  }
  return result;
}

export function catalogForPrompt() {
  return SKILL_FIELDS.map(
    (field) => `${field.label}: ${field.skills.join('; ')}`
  ).join('\n');
}
