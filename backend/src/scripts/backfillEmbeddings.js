import '../config/env.js';
import { query, pool } from '../db/pool.js';
import {
  embedAndStoreNeedSkills,
  embedAndStoreVolunteerSkills,
} from '../services/matching.js';

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required. Set it in the project-root .env file.');
  }

  const volunteers = await query(
    `SELECT id, skills FROM users
     WHERE role = 'volunteer' AND skills IS NOT NULL AND skills_embedding IS NULL`
  );
  console.log(`Embedding ${volunteers.rows.length} volunteers…`);
  for (const row of volunteers.rows) {
    await embedAndStoreVolunteerSkills(row.id, row.skills);
    console.log(`  volunteer ${row.id}`);
  }

  const needs = await query(
    `SELECT id, skills_needed FROM needs WHERE skills_embedding IS NULL`
  );
  console.log(`Embedding ${needs.rows.length} needs…`);
  for (const row of needs.rows) {
    await embedAndStoreNeedSkills(row.id, row.skills_needed);
    console.log(`  need ${row.id}`);
  }

  console.log('Backfill complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
