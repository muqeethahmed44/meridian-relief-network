import { Router } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        current_database() AS database,
        current_user AS db_user,
        inet_server_addr()::text AS server_addr,
        (SELECT COUNT(*)::int FROM needs) AS needs_count,
        (SELECT COUNT(*)::int FROM users) AS users_count
    `);
    const row = rows[0];
    res.json({
      status: 'ok',
      database: 'connected',
      cloudSql: {
        database: row.database,
        user: row.db_user,
        serverAddr: row.server_addr,
        needsCount: row.needs_count,
        usersCount: row.users_count,
      },
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      database: 'unavailable',
      error: err.message,
    });
  }
});

export default router;
