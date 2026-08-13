export type SkillField = {
  id: string;
  label: string;
  skills: string[];
};

/** Keep in sync with backend/src/data/skillsCatalog.js */
export const SKILL_FIELDS: SkillField[] = [
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
export const SKILL_DELIMITER = ' | ';

const SKILL_BY_LOWER = new Map(ALL_SKILLS.map((s) => [s.toLowerCase(), s]));

export function canonicalizeSkill(skill: string): string | null {
  return SKILL_BY_LOWER.get(skill.trim().toLowerCase()) ?? null;
}

export function parseSkills(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  const parts = value.split(/\s*\|\s*|\s*,\s*/).map((p) => p.trim()).filter(Boolean);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    const canonical = canonicalizeSkill(part);
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical);
      result.push(canonical);
    }
  }
  return result;
}

export function serializeSkills(skills: string[]): string {
  const seen = new Set<string>();
  const canonical: string[] = [];
  for (const skill of skills) {
    const c = canonicalizeSkill(skill);
    if (c && !seen.has(c)) {
      seen.add(c);
      canonical.push(c);
    }
  }
  return canonical.join(SKILL_DELIMITER);
}

export function fieldForSkill(skill: string): SkillField | undefined {
  return SKILL_FIELDS.find((field) => field.skills.includes(skill));
}

/** Quick-start skill packs volunteers can add on Account */
export type SampleSkillOpening = {
  id: string;
  label: string;
  description: string;
  skills: string[];
};

export const SAMPLE_SKILL_OPENINGS: SampleSkillOpening[] = [
  {
    id: 'debris_crew',
    label: 'Debris crew',
    description: 'Storm cleanup with tools and a truck',
    skills: ['Chainsaw operation', 'Pickup truck', 'Debris removal', 'Roof tarping'],
  },
  {
    id: 'shelter_medical',
    label: 'Shelter medical',
    description: 'Care support at temporary shelters',
    skills: ['EMT / first aid', 'Nursing support', 'Medical intake', 'Spanish interpretation'],
  },
  {
    id: 'intake_desk',
    label: 'Intake desk',
    description: 'Family intake, phones, and translation',
    skills: ['Family intake forms', 'Phone triage', 'Spanish interpretation', 'Community outreach'],
  },
  {
    id: 'supply_line',
    label: 'Supply line',
    description: 'Unload, sort, and hand out relief goods',
    skills: ['Supply distribution', 'Warehouse sorting', 'Heavy lifting', 'Inventory tracking'],
  },
];
