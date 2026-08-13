import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(__dirname, '../../../.env');
const backendEnv = path.resolve(__dirname, '../../.env');

// Prefer project-root .env; allow backend/.env as an optional override
dotenv.config({ path: rootEnv });
dotenv.config({ path: backendEnv, override: true });

export const env = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl: process.env.DATABASE_URL,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET,
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendDist: process.env.FRONTEND_DIST || '',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
};

if (!env.databaseUrl) {
  console.warn('Warning: DATABASE_URL is not set. Copy .env.example to .env at the project root.');
}

if (!env.sessionSecret) {
  console.warn('Warning: SESSION_SECRET is not set. Copy .env.example to .env at the project root.');
}
