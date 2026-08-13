import { Router } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db/pool.js';
import { publicUser, requireAuth } from '../middleware/auth.js';
import {
  embedAndStoreVolunteerSkills,
  refreshAllNeedMatches,
} from '../services/matching.js';
import { serializeSkills } from '../data/skillsCatalog.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeSkillsInput(skills) {
  if (skills == null || skills === '') return null;
  return serializeSkills(skills);
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName, role, skills } = req.body;

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({
        error: 'email, password, fullName, and role are required',
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!['coordinator', 'volunteer'].includes(role)) {
      return res.status(400).json({ error: 'role must be coordinator or volunteer' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows[0]) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let skillsValue = null;
    if (role === 'volunteer' && skills != null && skills !== '') {
      try {
        skillsValue = normalizeSkillsInput(skills);
      } catch (skillErr) {
        return res.status(400).json({ error: skillErr.message });
      }
    }

    const { rows } = await query(
      `INSERT INTO users (email, password_hash, full_name, role, skills)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, skills, created_at`,
      [normalizedEmail, passwordHash, fullName.trim(), role, skillsValue]
    );

    if (role === 'volunteer' && skillsValue) {
      await embedAndStoreVolunteerSkills(rows[0].id, skillsValue);
    }

    const user = publicUser(rows[0]);
    req.session.user = user;
    res.status(201).json({ user });
  } catch (err) {
    console.error('POST /auth/register', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const { rows } = await query(
      `SELECT id, email, password_hash, full_name, role, skills, created_at
       FROM users WHERE email = $1`,
      [normalizedEmail]
    );

    const row = rows[0];
    if (!row) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = publicUser(row);
    req.session.user = user;
    res.json({ user });
  } catch (err) {
    console.error('POST /auth/login', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('POST /auth/logout', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('mrn.sid');
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

router.patch('/me', requireAuth, async (req, res) => {
  try {
    const { fullName, skills } = req.body;
    const userId = req.session.user.id;
    let embedWarning = null;

    if (fullName !== undefined) {
      const trimmed = String(fullName).trim();
      if (!trimmed) {
        return res.status(400).json({ error: 'fullName cannot be empty' });
      }
      await query(`UPDATE users SET full_name = $1 WHERE id = $2`, [trimmed, userId]);
    }

    if (skills !== undefined) {
      if (req.session.user.role !== 'volunteer') {
        return res.status(403).json({ error: 'Only volunteers can update skills' });
      }
      let skillsValue;
      try {
        skillsValue = normalizeSkillsInput(skills);
      } catch (skillErr) {
        return res.status(400).json({ error: skillErr.message });
      }
      const result = await embedAndStoreVolunteerSkills(userId, skillsValue || '');
      if (result && result.embedded === false && skillsValue) {
        embedWarning = result.embedError
          ? 'Skills saved, but matching embedding failed. Try again later.'
          : 'Skills saved on your profile.';
      }
    }

    const { rows } = await query(
      `SELECT id, email, full_name, role, skills, created_at
       FROM users WHERE id = $1`,
      [userId]
    );
    const user = publicUser(rows[0]);
    req.session.user = user;
    res.json({ user, warning: embedWarning });
  } catch (err) {
    console.error('PATCH /auth/me', err);
    res.status(500).json({ error: err.message || 'Failed to update profile' });
  }
});

/** Dedicated skills update for volunteers — same session, no extra password step */
router.put('/skills', requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== 'volunteer') {
      return res.status(403).json({ error: 'Only volunteers can update skills' });
    }

    const { skills } = req.body;
    if (skills === undefined || skills === null) {
      return res.status(400).json({ error: 'skills is required (array of catalog skills)' });
    }

    let skillsValue;
    try {
      skillsValue = normalizeSkillsInput(skills);
    } catch (skillErr) {
      return res.status(400).json({ error: skillErr.message });
    }

    const result = await embedAndStoreVolunteerSkills(
      req.session.user.id,
      skillsValue || ''
    );
    const { rows } = await query(
      `SELECT id, email, full_name, role, skills, created_at
       FROM users WHERE id = $1`,
      [req.session.user.id]
    );
    const user = publicUser(rows[0]);
    req.session.user = user;
    res.json({
      user,
      embedded: Boolean(result?.embedded),
      warning:
        result?.embedded === false && skillsValue
          ? result.embedError
            ? 'Skills saved, but matching embedding failed. Try again later.'
            : null
          : null,
    });
  } catch (err) {
    console.error('PUT /auth/skills', err);
    res.status(500).json({ error: err.message || 'Failed to save skills' });
  }
});

router.delete('/me', requireAuth, async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.session.user.id;
    const role = req.session.user.role;

    if (!password) {
      return res.status(400).json({ error: 'password is required to delete your account' });
    }

    const { rows } = await query(
      `SELECT id, password_hash FROM users WHERE id = $1`,
      [userId]
    );
    const row = rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    await query(`DELETE FROM users WHERE id = $1`, [userId]);

    // Volunteer matches cascade-delete; rebuild top-3 lists for remaining volunteers
    if (role === 'volunteer' && process.env.OPENAI_API_KEY) {
      try {
        await refreshAllNeedMatches();
      } catch (matchErr) {
        console.error('refresh after account delete', matchErr);
      }
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('DELETE /auth/me session', err);
        return res.status(500).json({ error: 'Account deleted but session cleanup failed' });
      }
      res.clearCookie('mrn.sid');
      res.json({ ok: true });
    });
  } catch (err) {
    console.error('DELETE /auth/me', err);
    res.status(500).json({ error: err.message || 'Failed to delete account' });
  }
});

export default router;
