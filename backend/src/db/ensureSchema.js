import { pool } from './pool.js';

/** Idempotent POC schema helpers for tables added after initial docker init. */
export async function ensureApplicationsSchema() {
  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      need_id UUID NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
      volunteer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status application_status NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (need_id, volunteer_id)
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS applications_volunteer_idx ON applications (volunteer_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS applications_need_status_idx ON applications (need_id, status);
  `);
}

export async function ensureNeedsStateSchema() {
  await pool.query(`
    ALTER TABLE needs
      ADD COLUMN IF NOT EXISTS state TEXT;
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_needs_state ON needs (state);
  `);

  // Align seed / sample needs with Gulf Coast states + catalog skills
  await pool.query(`
    UPDATE needs SET
      title = 'Debris clearing — Houston East End',
      description = 'Multiple downed trees blocking residential streets in Houston after overnight storm surge.',
      skills_needed = 'Chainsaw operation | Pickup truck | Debris removal',
      state = 'Texas',
      urgency = 'critical'
    WHERE id = 'd1111111-1111-1111-1111-111111111111';

    UPDATE needs SET
      title = 'Medical support — NOLA shelter',
      description = 'Temporary shelter in New Orleans needs bilingual medical support and interpreters.',
      skills_needed = 'EMT / first aid | Spanish interpretation | Nursing support',
      state = 'Louisiana',
      urgency = 'high'
    WHERE id = 'd2222222-2222-2222-2222-222222222222';

    UPDATE needs SET
      title = 'Supply distribution — Gulfport',
      description = 'Unload pallets and distribute water, tarps, and hygiene kits to flooded Mississippi neighborhoods.',
      skills_needed = 'Heavy lifting | Supply distribution | General volunteering',
      state = 'Mississippi',
      urgency = 'high'
    WHERE id = 'd3333333-3333-3333-3333-333333333333';

    UPDATE needs SET
      title = 'Family intake — Mobile chapter',
      description = 'Help with family intake forms and phone triage at the Mobile, Alabama chapter office.',
      skills_needed = 'Spanish interpretation | Family intake forms | Phone triage',
      state = 'Alabama',
      urgency = 'moderate'
    WHERE id = 'd4444444-4444-4444-4444-444444444444';
  `);

  // Extra Florida sample need (idempotent insert)
  await pool.query(`
    INSERT INTO needs (id, title, description, urgency, skills_needed, state, posted_by)
    VALUES (
      'd5555555-5555-5555-5555-555555555555',
      'Flood recovery — Pensacola waterfront',
      'Clear debris along flooded Pensacola streets, tarp damaged roofs, and restore portable power.',
      'critical',
      'Boat operation | Roof tarping | Generator setup | Cleanup crew',
      'Florida',
      'b1111111-1111-1111-1111-111111111111'
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      urgency = EXCLUDED.urgency,
      skills_needed = EXCLUDED.skills_needed,
      state = EXCLUDED.state;
  `);

  // Second Texas sample for richer dropdown filtering
  await pool.query(`
    INSERT INTO needs (id, title, description, urgency, skills_needed, state, posted_by)
    VALUES (
      'd6666666-6666-6666-6666-666666666666',
      'Warehouse sorting — Beaumont hub',
      'Sort incoming relief pallets and prep outbound kits for Southeast Texas chapters.',
      'moderate',
      'Warehouse sorting | Inventory tracking | Heavy lifting',
      'Texas',
      'b1111111-1111-1111-1111-111111111111'
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      urgency = EXCLUDED.urgency,
      skills_needed = EXCLUDED.skills_needed,
      state = EXCLUDED.state;
  `);
}

export async function ensureSchema() {
  await ensureApplicationsSchema();
  await ensureNeedsStateSchema();
}
