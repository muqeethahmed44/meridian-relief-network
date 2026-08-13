import type { GulfState } from './states';

export type Urgency = 'critical' | 'high' | 'moderate' | 'low';

export type Need = {
  id: string;
  title: string;
  description: string;
  urgency: Urgency;
  skills_needed: string;
  state?: GulfState | string | null;
  posted_by_name?: string;
};

/** Fallback sample data when the API/DB is not running yet */
export const mockNeeds: Need[] = [
  {
    id: 'd1111111-1111-1111-1111-111111111111',
    title: 'Debris clearing — Houston East End',
    description:
      'Multiple downed trees blocking residential streets in Houston after overnight storm surge.',
    urgency: 'critical',
    skills_needed: 'Chainsaw operation | Pickup truck | Debris removal',
    state: 'Texas',
    posted_by_name: 'Maya Chen',
  },
  {
    id: 'd2222222-2222-2222-2222-222222222222',
    title: 'Medical support — NOLA shelter',
    description: 'Temporary shelter in New Orleans needs bilingual medical support and interpreters.',
    urgency: 'high',
    skills_needed: 'EMT / first aid | Spanish interpretation | Nursing support',
    state: 'Louisiana',
    posted_by_name: 'James Baptiste',
  },
  {
    id: 'd3333333-3333-3333-3333-333333333333',
    title: 'Supply distribution — Gulfport',
    description:
      'Unload pallets and distribute water, tarps, and hygiene kits to flooded Mississippi neighborhoods.',
    urgency: 'high',
    skills_needed: 'Heavy lifting | Supply distribution | General volunteering',
    state: 'Mississippi',
    posted_by_name: 'Maya Chen',
  },
  {
    id: 'd4444444-4444-4444-4444-444444444444',
    title: 'Family intake — Mobile chapter',
    description: 'Help with family intake forms and phone triage at the Mobile, Alabama chapter office.',
    urgency: 'moderate',
    skills_needed: 'Spanish interpretation | Family intake forms | Phone triage',
    state: 'Alabama',
    posted_by_name: 'James Baptiste',
  },
  {
    id: 'd5555555-5555-5555-5555-555555555555',
    title: 'Flood recovery — Pensacola waterfront',
    description:
      'Clear debris along flooded Pensacola streets, tarp damaged roofs, and restore portable power.',
    urgency: 'critical',
    skills_needed: 'Boat operation | Roof tarping | Generator setup | Cleanup crew',
    state: 'Florida',
    posted_by_name: 'Maya Chen',
  },
  {
    id: 'd6666666-6666-6666-6666-666666666666',
    title: 'Warehouse sorting — Beaumont hub',
    description: 'Sort incoming relief pallets and prep outbound kits for Southeast Texas chapters.',
    urgency: 'moderate',
    skills_needed: 'Warehouse sorting | Inventory tracking | Heavy lifting',
    state: 'Texas',
    posted_by_name: 'Maya Chen',
  },
];
