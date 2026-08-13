-- Meridian Relief Network — schema with pgvector skill embeddings

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE user_role AS ENUM ('coordinator', 'volunteer');
CREATE TYPE need_urgency AS ENUM ('critical', 'high', 'moderate', 'low');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  skills TEXT,
  -- OpenAI text-embedding-3-small
  skills_embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  urgency need_urgency NOT NULL DEFAULT 'moderate',
  skills_needed TEXT NOT NULL,
  state TEXT,
  skills_embedding vector(1536),
  posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id UUID NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
  volunteer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score DOUBLE PRECISION,
  rationale TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (need_id, volunteer_id)
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_needs_urgency ON needs(urgency);
CREATE INDEX idx_matches_need ON matches(need_id);
CREATE INDEX idx_matches_volunteer ON matches(volunteer_id);
