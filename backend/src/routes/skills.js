import { Router } from 'express';
import { SKILL_FIELDS, ALL_SKILLS } from '../data/skillsCatalog.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ fields: SKILL_FIELDS, skills: ALL_SKILLS });
});

export default router;
