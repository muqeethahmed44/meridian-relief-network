import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const APPLICATION_SELECT = `
  SELECT
    a.id, a.need_id, a.volunteer_id, a.status, a.created_at, a.updated_at,
    n.title AS need_title, n.urgency, n.skills_needed, n.state AS need_state,
    n.description AS need_description,
    u.full_name AS volunteer_name, u.email AS volunteer_email, u.skills AS volunteer_skills
  FROM applications a
  JOIN needs n ON n.id = a.need_id
  JOIN users u ON u.id = a.volunteer_id
`;

router.get('/', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const params = [];
    const clauses = [];

    if (req.session.user.role === 'volunteer') {
      params.push(req.session.user.id);
      clauses.push(`a.volunteer_id = $${params.length}`);
    }

    if (status && ['pending', 'approved', 'rejected'].includes(String(status))) {
      params.push(String(status));
      clauses.push(`a.status = $${params.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const { rows } = await query(
      `${APPLICATION_SELECT}
       ${where}
       ORDER BY
         CASE a.status
           WHEN 'pending' THEN 1
           WHEN 'approved' THEN 2
           ELSE 3
         END,
         a.updated_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /applications', err);
    res.status(500).json({ error: 'Failed to load applications' });
  }
});

router.post('/', requireRole('volunteer'), async (req, res) => {
  try {
    const needId = req.body?.needId;
    if (!needId) {
      return res.status(400).json({ error: 'needId is required' });
    }

    const need = await query('SELECT id FROM needs WHERE id = $1', [needId]);
    if (!need.rows[0]) {
      return res.status(404).json({ error: 'Need not found' });
    }

    const volunteerId = req.session.user.id;
    const existing = await query(
      `SELECT id, status FROM applications
       WHERE need_id = $1 AND volunteer_id = $2`,
      [needId, volunteerId]
    );

    if (existing.rows[0]) {
      const row = existing.rows[0];
      if (row.status === 'pending') {
        return res.status(409).json({ error: 'You already applied — waiting on coordinator approval.' });
      }
      if (row.status === 'approved') {
        return res.status(409).json({ error: 'You are already approved for this need.' });
      }
      // Rejected: allow re-apply
      const { rows } = await query(
        `UPDATE applications
         SET status = 'pending', updated_at = NOW()
         WHERE id = $1
         RETURNING id`,
        [row.id]
      );
      const full = await query(`${APPLICATION_SELECT} WHERE a.id = $1`, [rows[0].id]);
      return res.status(200).json(full.rows[0]);
    }

    const { rows } = await query(
      `INSERT INTO applications (need_id, volunteer_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING id`,
      [needId, volunteerId]
    );
    const full = await query(`${APPLICATION_SELECT} WHERE a.id = $1`, [rows[0].id]);
    res.status(201).json(full.rows[0]);
  } catch (err) {
    console.error('POST /applications', err);
    res.status(500).json({ error: err.message || 'Failed to apply' });
  }
});

router.patch('/:id', requireRole('coordinator'), async (req, res) => {
  try {
    const status = req.body?.status;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved or rejected' });
    }

    const { rows } = await query(
      `UPDATE applications
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id`,
      [status, req.params.id]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const full = await query(`${APPLICATION_SELECT} WHERE a.id = $1`, [rows[0].id]);
    res.json(full.rows[0]);
  } catch (err) {
    console.error('PATCH /applications/:id', err);
    res.status(500).json({ error: err.message || 'Failed to update application' });
  }
});

export default router;
