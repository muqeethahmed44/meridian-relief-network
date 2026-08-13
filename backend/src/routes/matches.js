import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';
import {
  embedAndStoreVolunteerSkills,
  refreshAllNeedMatches,
  refreshMatchesForNeed,
} from '../services/matching.js';

const router = Router();

async function loadVolunteerMatches(volunteerId) {
  const { rows } = await query(
    `SELECT
       m.id, m.need_id, m.volunteer_id, m.score, m.rationale, m.created_at,
       n.title AS need_title, n.urgency, n.skills_needed, n.state AS need_state,
       u.full_name AS volunteer_name, u.skills AS volunteer_skills
     FROM matches m
     JOIN needs n ON n.id = m.need_id
     JOIN users u ON u.id = m.volunteer_id
     WHERE m.volunteer_id = $1
     ORDER BY n.created_at DESC, m.score DESC NULLS LAST`,
    [volunteerId]
  );
  return rows;
}

/** Top matches grouped by need (up to 3 each), ranked by similarity score */
router.get('/', async (req, res) => {
  try {
    const { needId, volunteerId } = req.query;
    const params = [];
    const clauses = [];

    if (needId) {
      params.push(needId);
      clauses.push(`m.need_id = $${params.length}`);
    }
    if (volunteerId) {
      params.push(volunteerId);
      clauses.push(`m.volunteer_id = $${params.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const { rows } = await query(
      `SELECT
         m.id, m.need_id, m.volunteer_id, m.score, m.rationale, m.created_at,
         n.title AS need_title, n.urgency, n.skills_needed, n.state AS need_state,
         u.full_name AS volunteer_name, u.skills AS volunteer_skills
       FROM matches m
       JOIN needs n ON n.id = m.need_id
       JOIN users u ON u.id = m.volunteer_id
       ${where}
       ORDER BY n.created_at DESC, m.score DESC NULLS LAST`,
      params
    );

    // Keep at most 3 matches per need in the response
    const byNeed = new Map();
    for (const row of rows) {
      const list = byNeed.get(row.need_id) || [];
      if (list.length < 3) {
        list.push(row);
        byNeed.set(row.need_id, list);
      }
    }

    res.json([...byNeed.values()].flat());
  } catch (err) {
    console.error('GET /matches', err);
    res.status(500).json({ error: 'Failed to load matches' });
  }
});

/** Volunteer: re-embed skills (if any), rebuild rankings, return their matches */
router.post('/refresh-mine', requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== 'volunteer') {
      return res.status(403).json({ error: 'Only volunteers can refresh their matches' });
    }

    const volunteerId = req.session.user.id;
    const { rows } = await query(
      `SELECT skills FROM users WHERE id = $1 AND role = 'volunteer'`,
      [volunteerId]
    );
    const volunteer = rows[0];
    if (!volunteer) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    let embedded = false;
    let warning = null;

    if (volunteer.skills?.trim()) {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({
          error: 'OPENAI_API_KEY is required to refresh matches',
        });
      }
      const result = await embedAndStoreVolunteerSkills(volunteerId, volunteer.skills);
      embedded = Boolean(result?.embedded);
      if (!embedded) {
        warning = result?.embedError
          ? 'Could not refresh skill embedding. Try saving skills again on your profile.'
          : 'Skills are on your profile, but matching could not be refreshed.';
      }
    } else {
      await refreshAllNeedMatches();
      warning = 'Add skills on your Account profile so you can appear in matches.';
    }

    const matches = await loadVolunteerMatches(volunteerId);
    res.json({ matches, embedded, warning });
  } catch (err) {
    console.error('POST /matches/refresh-mine', err);
    res.status(500).json({ error: err.message || 'Failed to refresh matches' });
  }
});

router.post('/refresh/:needId', requireAuth, async (req, res) => {
  try {
    const matches = await refreshMatchesForNeed(req.params.needId);
    res.json(matches);
  } catch (err) {
    console.error('POST /matches/refresh/:needId', err);
    res.status(500).json({ error: err.message || 'Failed to refresh matches' });
  }
});

export default router;
