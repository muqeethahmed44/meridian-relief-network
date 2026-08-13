-- State where the open need / requirement is located

ALTER TABLE needs
  ADD COLUMN IF NOT EXISTS state TEXT;

CREATE INDEX IF NOT EXISTS idx_needs_state ON needs (state);
