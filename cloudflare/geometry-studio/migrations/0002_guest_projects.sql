-- Anonymous Geometry Studio cloud projects: no signup, no login.
-- Editing requires a random 256-bit per-project key (SHA-256 stored in D1).
CREATE TABLE IF NOT EXISTS guest_projects (
  id TEXT PRIMARY KEY,
  edit_hash TEXT NOT NULL,
  title TEXT NOT NULL,
  payload TEXT NOT NULL,
  svg TEXT NOT NULL,
  share_id TEXT UNIQUE,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS guest_projects_share ON guest_projects(share_id) WHERE share_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS guest_rate_limits (
  bucket TEXT PRIMARY KEY,
  used INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS guest_rate_limits_expiry ON guest_rate_limits(expires_at);
