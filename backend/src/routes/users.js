import { Router } from 'express';
import { query } from '../db/pool.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { role } = req.query;
    const params = [];
    let where = '';

    if (role) {
      params.push(role);
      where = `WHERE role = $${params.length}`;
    }

    const { rows } = await query(
      `SELECT id, email, full_name, role, skills, created_at
       FROM users
       ${where}
       ORDER BY full_name`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /users', err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, email, full_name, role, skills, created_at
       FROM users
       WHERE id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET /users/:id', err);
    res.status(500).json({ error: 'Failed to load user' });
  }
});

export default router;
