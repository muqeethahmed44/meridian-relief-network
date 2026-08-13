import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireRole } from '../middleware/auth.js';
import { embedAndStoreNeedSkills } from '../services/matching.js';
import { serializeSkills } from '../data/skillsCatalog.js';
import { isGulfState } from '../data/states.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const params = [];
    let stateFilter = '';
    if (req.query.state && isGulfState(String(req.query.state))) {
      params.push(String(req.query.state));
      stateFilter = `WHERE n.state = $${params.length}`;
    }

    const { rows } = await query(
      `SELECT
         n.id, n.title, n.description, n.urgency, n.skills_needed, n.state,
         n.posted_by, n.created_at,
         u.full_name AS posted_by_name,
         (n.skills_embedding IS NOT NULL) AS has_embedding
       FROM needs n
       LEFT JOIN users u ON u.id = n.posted_by
       ${stateFilter}
       ORDER BY
         CASE n.urgency
           WHEN 'critical' THEN 1
           WHEN 'high' THEN 2
           WHEN 'moderate' THEN 3
           WHEN 'low' THEN 4
         END,
         n.created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /needs', err);
    res.status(500).json({ error: 'Failed to load needs' });
  }
});

router.get('/:id/matches', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         m.id, m.need_id, m.volunteer_id, m.score, m.rationale, m.created_at,
         u.full_name AS volunteer_name, u.skills AS volunteer_skills, u.email AS volunteer_email
       FROM matches m
       JOIN users u ON u.id = m.volunteer_id
       WHERE m.need_id = $1
       ORDER BY m.score DESC NULLS LAST, m.created_at DESC
       LIMIT 3`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /needs/:id/matches', err);
    res.status(500).json({ error: 'Failed to load matches' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         n.id, n.title, n.description, n.urgency, n.skills_needed, n.state,
         n.posted_by, n.created_at,
         u.full_name AS posted_by_name,
         (n.skills_embedding IS NOT NULL) AS has_embedding
       FROM needs n
       LEFT JOIN users u ON u.id = n.posted_by
       WHERE n.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Need not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /needs/:id', err);
    res.status(500).json({ error: 'Failed to load need' });
  }
});

router.post('/', requireRole('coordinator'), async (req, res) => {
  try {
    const { title, description, urgency = 'moderate', skillsNeeded, state } = req.body;

    if (!title || !description || skillsNeeded == null || skillsNeeded === '') {
      return res.status(400).json({
        error: 'title, description, and skillsNeeded are required',
      });
    }

    if (!isGulfState(state)) {
      return res.status(400).json({
        error: 'state must be one of: Texas, Louisiana, Mississippi, Alabama, Florida',
      });
    }

    let skillsValue;
    try {
      skillsValue = serializeSkills(skillsNeeded);
    } catch (skillErr) {
      return res.status(400).json({ error: skillErr.message });
    }
    if (!skillsValue) {
      return res.status(400).json({ error: 'Select at least one skill from the catalog' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: 'OPENAI_API_KEY is required to post a need (embeddings)',
      });
    }

    const { rows } = await query(
      `INSERT INTO needs (title, description, urgency, skills_needed, state, posted_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, description, urgency, skills_needed, state, posted_by, created_at`,
      [title, description, urgency, skillsValue, state, req.session.user.id]
    );

    const need = rows[0];
    const matches = await embedAndStoreNeedSkills(need.id, skillsValue);

    res.status(201).json({
      ...need,
      has_embedding: true,
      matches,
    });
  } catch (err) {
    console.error('POST /needs', err);
    res.status(500).json({ error: err.message || 'Failed to create need' });
  }
});

router.patch('/:id', requireRole('coordinator'), async (req, res) => {
  try {
    if (req.body.state !== undefined && !isGulfState(req.body.state)) {
      return res.status(400).json({
        error: 'state must be one of: Texas, Louisiana, Mississippi, Alabama, Florida',
      });
    }

    const bodyMap = {
      title: 'title',
      description: 'description',
      urgency: 'urgency',
      skillsNeeded: 'skills_needed',
      state: 'state',
    };

    const sets = [];
    const params = [];

    let skillsValue;
    if (req.body.skillsNeeded !== undefined) {
      try {
        skillsValue = serializeSkills(req.body.skillsNeeded);
      } catch (skillErr) {
        return res.status(400).json({ error: skillErr.message });
      }
      if (!skillsValue) {
        return res.status(400).json({ error: 'Select at least one skill from the catalog' });
      }
    }

    for (const [key, column] of Object.entries(bodyMap)) {
      if (req.body[key] !== undefined) {
        const value = key === 'skillsNeeded' ? skillsValue : req.body[key];
        params.push(value);
        sets.push(`${column} = $${params.length}`);
      }
    }

    if (!sets.length) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    params.push(req.params.id);

    const { rows } = await query(
      `UPDATE needs SET ${sets.join(', ')} WHERE id = $${params.length}
       RETURNING id, title, description, urgency, skills_needed, state, posted_by, created_at`,
      params
    );

    if (!rows[0]) return res.status(404).json({ error: 'Need not found' });

    let matches = [];
    if (skillsValue !== undefined) {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({
          error: 'OPENAI_API_KEY is required to update skills_needed',
        });
      }
      matches = await embedAndStoreNeedSkills(rows[0].id, skillsValue);
    }

    res.json({ ...rows[0], matches });
  } catch (err) {
    console.error('PATCH /needs/:id', err);
    res.status(500).json({ error: err.message || 'Failed to update need' });
  }
});

export default router;
