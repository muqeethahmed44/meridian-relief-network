import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { runWhereIFitChat } from '../services/chat.js';

const router = Router();

router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.session.user.role !== 'volunteer') {
      return res.status(403).json({
        error: 'The Where I Fit assistant is for volunteers only',
      });
    }

    const { messages } = req.body;
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const result = await runWhereIFitChat({
      messages,
      volunteer: req.session.user,
    });

    res.json(result);
  } catch (err) {
    console.error('POST /chat', err);
    const message = err.message || 'Chat failed';
    const status = message.includes('OPENAI_API_KEY') ? 503 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;
