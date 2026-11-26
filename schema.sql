-- Run in Neon or Supabase SQL Editor (also auto-migrated by api/_lib/db.js)

CREATE TABLE IF NOT EXISTS freshers_checkins (
  id BIGSERIAL PRIMARY KEY,
  roll_no VARCHAR(32) NOT NULL UNIQUE,
  full_name VARCHAR(80) NOT NULL,
  first_name VARCHAR(40) NOT NULL,
  entry_source VARCHAR(24) NOT NULL DEFAULT 'qr_self',
  reverify_count INTEGER NOT NULL DEFAULT 0,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  feedback_rating SMALLINT,
  feedback_comment TEXT,
  feedback_submitted_at TIMESTAMPTZ
);

ALTER TABLE freshers_checkins ADD COLUMN IF NOT EXISTS feedback_rating SMALLINT;
ALTER TABLE freshers_checkins ADD COLUMN IF NOT EXISTS feedback_comment TEXT;
ALTER TABLE freshers_checkins ADD COLUMN IF NOT EXISTS feedback_submitted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS event_settings (
  setting_key VARCHAR(64) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO event_settings (setting_key, setting_value)
VALUES ('feedback_unlock_at', '2026-11-26T12:30:00+05:30')
ON CONFLICT (setting_key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_freshers_checked_in_at
  ON freshers_checkins (checked_in_at DESC);
