import { parseSkills } from '../data/skillsCatalog';

/** Catalog skills shared between a volunteer profile and a need. */
export function alignedSkills(
  volunteerSkills: string | null | undefined,
  needSkills: string | null | undefined
): string[] {
  const volunteer = new Set(parseSkills(volunteerSkills));
  return parseSkills(needSkills).filter((skill) => volunteer.has(skill));
}
