-- Enable pgvector and add embedding columns on the existing database

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE users ADD COLUMN IF NOT EXISTS skills_embedding vector(1536);
ALTER TABLE needs ADD COLUMN IF NOT EXISTS skills_embedding vector(1536);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS score DOUBLE PRECISION;
