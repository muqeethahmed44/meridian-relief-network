-- Apply to existing DBs created before auth was added
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Temporary placeholder; seed/update script sets real bcrypt hashes
UPDATE users SET password_hash = 'CHANGE_ME' WHERE password_hash IS NULL;

ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
