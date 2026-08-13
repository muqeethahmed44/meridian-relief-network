import { query } from '../db/pool.js';
import { createEmbedding, embeddingToSql } from './embeddings.js';

const STOP = new Set([
  'and', 'the', 'for', 'with', 'has', 'have', 'can', 'who', 'are', 'was', 'were',
  'this', 'that', 'from', 'into', 'your', 'their', 'able', 'need', 'needs', 'help',
]);

function tokenize(text) {
  return [
    ...new Set(
      String(text || '')
        .toLowerCase()
        .split(/[^a-z0-9+#/]+/)
        .filter((t) => t.length > 2 && !STOP.has(t))
    ),
  ];
}

export function buildRationale(volunteerName, volunteerSkills, needSkills, score) {
  const volunteerTokens = tokenize(volunteerSkills);
  const needTokens = tokenize(needSkills);
  const overlap = needTokens.filter((needToken) =>
    volunteerTokens.some(
      (volunteerToken) =>
        volunteerToken.includes(needToken) || needToken.includes(volunteerToken)
    )
  );
  const pct = Math.max(1, Math.min(99, Math.round(Number(score) * 100)));

  if (overlap.length > 0) {
    const shared = overlap.slice(0, 3).join(', ');
    return `${volunteerName} looks like a strong fit (${pct}% similar): shared signals include ${shared}.`;
  }

  return `${volunteerName}'s skills profile is semantically close to this need (${pct}% similar), even without exact keyword overlap.`;
}

export async function refreshMatchesForNeed(needId) {
  const needResult = await query(
    `SELECT id, skills_needed, skills_embedding
     FROM needs
     WHERE id = $1`,
    [needId]
  );
  const need = needResult.rows[0];
  if (!need?.skills_embedding) {
    return [];
  }

  const { rows: top } = await query(
    `SELECT
       u.id,
       u.full_name,
       u.skills,
       1 - (u.skills_embedding <=> $1::vector) AS score
     FROM users u
     WHERE u.role = 'volunteer'
       AND u.skills_embedding IS NOT NULL
     ORDER BY u.skills_embedding <=> $1::vector
     LIMIT 3`,
    [need.skills_embedding]
  );

  await query('DELETE FROM matches WHERE need_id = $1', [needId]);

  const saved = [];
  for (const row of top) {
    const score = Number(row.score);
    const rationale = buildRationale(
      row.full_name,
      row.skills,
      need.skills_needed,
      score
    );
    const inserted = await query(
      `INSERT INTO matches (need_id, volunteer_id, score, rationale)
       VALUES ($1, $2, $3, $4)
       RETURNING id, need_id, volunteer_id, score, rationale, created_at`,
      [needId, row.id, score, rationale]
    );
    saved.push({
      ...inserted.rows[0],
      volunteer_name: row.full_name,
      volunteer_skills: row.skills,
    });
  }

  return saved;
}

export async function refreshAllNeedMatches() {
  const { rows } = await query(
    `SELECT id FROM needs WHERE skills_embedding IS NOT NULL`
  );
  for (const row of rows) {
    await refreshMatchesForNeed(row.id);
  }
}

export async function embedAndStoreNeedSkills(needId, skillsNeeded) {
  const vector = await createEmbedding(skillsNeeded);
  await query(
    `UPDATE needs
     SET skills_embedding = $1::vector
     WHERE id = $2`,
    [embeddingToSql(vector), needId]
  );
  return refreshMatchesForNeed(needId);
}

export async function embedAndStoreVolunteerSkills(userId, skills) {
  if (!skills?.trim()) {
    await query(
      `UPDATE users SET skills = NULL, skills_embedding = NULL WHERE id = $1`,
      [userId]
    );
    if (process.env.OPENAI_API_KEY) {
      await refreshAllNeedMatches();
    }
    return { embedded: false };
  }

  const trimmed = skills.trim();

  // Always persist the skills text on the profile first
  await query(`UPDATE users SET skills = $1 WHERE id = $2`, [trimmed, userId]);

  if (!process.env.OPENAI_API_KEY) {
    return { embedded: false };
  }

  try {
    const vector = await createEmbedding(trimmed);
    await query(
      `UPDATE users SET skills_embedding = $1::vector WHERE id = $2`,
      [embeddingToSql(vector), userId]
    );
    await refreshAllNeedMatches();
    return { embedded: true };
  } catch (err) {
    console.error('Volunteer skill embedding failed; skills text was still saved.', err);
    return { embedded: false, embedError: err.message };
  }
}
