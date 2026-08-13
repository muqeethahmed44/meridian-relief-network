import express from 'express';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { pool } from './db/pool.js';
import { ensureSchema } from './db/ensureSchema.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import needsRouter from './routes/needs.js';
import matchesRouter from './routes/matches.js';
import chatRouter from './routes/chat.js';
import skillsRouter from './routes/skills.js';
import applicationsRouter from './routes/applications.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PgSession = connectPgSimple(session);

/** Built Vite assets — Docker sets FRONTEND_DIST=/app/frontend/dist */
const frontendDist =
  env.frontendDist || path.resolve(__dirname, '../../frontend/dist');
const spaIndex = path.join(frontendDist, 'index.html');
const serveSpa = fs.existsSync(spaIndex);

if (!env.sessionSecret) {
  throw new Error('SESSION_SECRET is missing. Copy .env.example to .env at the project root.');
}

await ensureSchema();

app.disable('x-powered-by');

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    name: 'mrn.sid',
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      // Set COOKIE_SECURE=true behind HTTPS. Leave false for local docker HTTP (:8080).
      secure: env.cookieSecure,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/needs', needsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/chat', chatRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/applications', applicationsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (serveSpa) {
  // Production / single-container: API + React SPA from one Express process
  app.use(express.static(frontendDist, { index: false }));
  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(spaIndex);
  });
} else {
  app.get('/', (_req, res) => {
    res.json({
      name: 'Meridian Relief Network API',
      version: '0.2.0',
      docs: 'See /api/health, /api/auth, /api/users, /api/needs, /api/matches, /api/applications',
      hint: 'Build the frontend (npm run build) to serve the SPA from this server.',
    });
  });
}

app.listen(env.port, '0.0.0.0', () => {
  const mode = serveSpa ? 'API + SPA' : 'API only';
  console.log(`MRN ${mode} listening on http://0.0.0.0:${env.port}`);
  if (serveSpa) {
    console.log(`Serving frontend from ${frontendDist}`);
  }
});
