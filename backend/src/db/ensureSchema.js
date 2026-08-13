import { pool } from './pool.js';

/** Idempotent core schema for fresh Cloud SQL / empty databases. */
export async function ensureCoreSchema() {
  await pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);

  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('coordinator', 'volunteer');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE need_urgency AS ENUM ('critical', 'high', 'moderate', 'low');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role user_role NOT NULL,
      skills TEXT,
      skills_embedding vector(1536),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS needs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      urgency need_urgency NOT NULL DEFAULT 'moderate',
      skills_needed TEXT NOT NULL,
      state TEXT,
      skills_embedding vector(1536),
      posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS matches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      need_id UUID NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
      volunteer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      score DOUBLE PRECISION,
      rationale TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (need_id, volunteer_id)
    );
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_needs_urgency ON needs(urgency)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_matches_need ON matches(need_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_matches_volunteer ON matches(volunteer_id)`);
}

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

  // Seed demo users if DB is empty (password for all: password123)
  const { rows: userCount } = await pool.query(`SELECT COUNT(*)::int AS n FROM users`);
  if (userCount[0].n === 0) {
    await pool.query(`
      INSERT INTO users (id, email, password_hash, full_name, role, skills) VALUES
        ('b1111111-1111-1111-1111-111111111111', 'coord.houston@meridianrelief.example',
         '$2b$10$ZA9NkCQcd92ipAA.NGm52OKvKF.dbq7w.CqMbSAywE5ej.gYOSppu',
         'Maya Chen', 'coordinator', NULL),
        ('b2222222-2222-2222-2222-222222222222', 'coord.nola@meridianrelief.example',
         '$2b$10$ZA9NkCQcd92ipAA.NGm52OKvKF.dbq7w.CqMbSAywE5ej.gYOSppu',
         'James Baptiste', 'coordinator', NULL),
        ('c1111111-1111-1111-1111-111111111111', 'alex.rivera@example.com',
         '$2b$10$ZA9NkCQcd92ipAA.NGm52OKvKF.dbq7w.CqMbSAywE5ej.gYOSppu',
         'Alex Rivera', 'volunteer',
         'Chainsaw operation | Pickup truck | Debris removal | Roof tarping'),
        ('c2222222-2222-2222-2222-222222222222', 'sam.okonkwo@example.com',
         '$2b$10$ZA9NkCQcd92ipAA.NGm52OKvKF.dbq7w.CqMbSAywE5ej.gYOSppu',
         'Sam Okonkwo', 'volunteer',
         'Spanish interpretation | EMT / first aid | Supply distribution')
      ON CONFLICT (id) DO NOTHING
    `);
  }

  // Align / insert Gulf Coast sample needs
  await pool.query(`
    INSERT INTO needs (id, title, description, urgency, skills_needed, state, posted_by) VALUES
      ('d1111111-1111-1111-1111-111111111111',
       'Debris clearing — Houston East End',
       'Multiple downed trees blocking residential streets in Houston after overnight storm surge.',
       'critical',
       'Chainsaw operation | Pickup truck | Debris removal',
       'Texas',
       'b1111111-1111-1111-1111-111111111111'),
      ('d2222222-2222-2222-2222-222222222222',
       'Medical support — NOLA shelter',
       'Temporary shelter in New Orleans needs bilingual medical support and interpreters.',
       'high',
       'EMT / first aid | Spanish interpretation | Nursing support',
       'Louisiana',
       'b2222222-2222-2222-2222-222222222222'),
      ('d3333333-3333-3333-3333-333333333333',
       'Supply distribution — Gulfport',
       'Unload pallets and distribute water, tarps, and hygiene kits to flooded Mississippi neighborhoods.',
       'high',
       'Heavy lifting | Supply distribution | General volunteering',
       'Mississippi',
       'b1111111-1111-1111-1111-111111111111'),
      ('d4444444-4444-4444-4444-444444444444',
       'Family intake — Mobile chapter',
       'Help with family intake forms and phone triage at the Mobile, Alabama chapter office.',
       'moderate',
       'Spanish interpretation | Family intake forms | Phone triage',
       'Alabama',
       'b2222222-2222-2222-2222-222222222222'),
      ('d5555555-5555-5555-5555-555555555555',
       'Flood recovery — Pensacola waterfront',
       'Clear debris along flooded Pensacola streets, tarp damaged roofs, and restore portable power.',
       'critical',
       'Boat operation | Roof tarping | Generator setup | Cleanup crew',
       'Florida',
       'b1111111-1111-1111-1111-111111111111'),
      ('d6666666-6666-6666-6666-666666666666',
       'Warehouse sorting — Beaumont hub',
       'Sort incoming relief pallets and prep outbound kits for Southeast Texas chapters.',
       'moderate',
       'Warehouse sorting | Inventory tracking | Heavy lifting',
       'Texas',
       'b1111111-1111-1111-1111-111111111111')
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      urgency = EXCLUDED.urgency,
      skills_needed = EXCLUDED.skills_needed,
      state = EXCLUDED.state
  `);
}

export async function ensureSchema() {
  await ensureCoreSchema();
  await ensureApplicationsSchema();
  await ensureNeedsStateSchema();
}
