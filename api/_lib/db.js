'use strict';

const { Pool } = require('pg');

const DEFAULT_FEEDBACK_UNLOCK_AT = '2026-11-26T12:30:00+05:30';
let tableReady = false;

function sanitizeConnectionString(raw) {
  let s = String(raw || '').trim();
  if (/^psql\s+/i.test(s)) {
    s = s.replace(/^psql\s+/i, '').trim();
  }
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    s = s.slice(1, -1).trim();
  }
  s = s.replace(/([?&])channel_binding=[^&]*&?/gi, '$1').replace(/[?&]$/, '');
  return s;
}

function getPool() {
  if (global.__pimPgPool) return global.__pimPgPool;
  const rawConnStr =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.NEON_DATABASE_URL;

  const connStr = sanitizeConnectionString(rawConnStr);
  if (!connStr) {
    const err = new Error('DATABASE_URL environment variable is missing.');
    err.publicCode = 'MISSING_DATABASE_URL';
    throw err;
  }
  if (!/^postgres(ql)?:\/\//i.test(connStr)) {
    const err = new Error('DATABASE_URL must start with postgresql:// or postgres://.');
    err.publicCode = 'INVALID_DATABASE_URL';
    throw err;
  }

  const needsSsl = !/localhost|127\.0\.0\.1/i.test(connStr);
  global.__pimPgPool = new Pool({
    connectionString: connStr,
    max: 5,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 8000,
    ssl: needsSsl ? { rejectUnauthorized: false } : false
  });
  return global.__pimPgPool;
}

async function ensureSchema() {
  const pool = getPool();
  if (tableReady) return pool;
  // Fast check: skip DDL if tables already exist in Neon (saves ~300-600ms on cold start)
  try {
    await pool.query(`SELECT 1 FROM freshers_checkins LIMIT 1;`);
    await pool.query(`SELECT 1 FROM event_settings LIMIT 1;`);
    tableReady = true;
    return pool;
  } catch (err) {
    if (err && err.code !== '42P01') throw err;
  }

  await pool.query(`
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
    VALUES ('feedback_unlock_at', '${DEFAULT_FEEDBACK_UNLOCK_AT}')
    ON CONFLICT (setting_key) DO NOTHING;
  `);
  tableReady = true;
  return pool;
}

async function getFeedbackUnlockAt() {
  try {
    const pool = await ensureSchema();
    const { rows } = await pool.query(
      `SELECT setting_value FROM event_settings WHERE setting_key = 'feedback_unlock_at' LIMIT 1`
    );
    const val = rows[0]?.setting_value || DEFAULT_FEEDBACK_UNLOCK_AT;
    const ms = Date.parse(val);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : new Date(DEFAULT_FEEDBACK_UNLOCK_AT).toISOString();
  } catch {
    return new Date(DEFAULT_FEEDBACK_UNLOCK_AT).toISOString();
  }
}

async function setFeedbackUnlockAt(isoString) {
  const pool = await ensureSchema();
  const normalized = new Date(isoString).toISOString();
  await pool.query(
    `INSERT INTO event_settings (setting_key, setting_value, updated_at)
     VALUES ('feedback_unlock_at', $1, NOW())
     ON CONFLICT (setting_key) DO UPDATE SET
       setting_value = EXCLUDED.setting_value,
       updated_at = NOW()`,
    [normalized]
  );
  return normalized;
}

async function findByRollNo(rollNo) {
  const pool = await ensureSchema();
  const { rows } = await pool.query(
    `SELECT id, roll_no, full_name, first_name, entry_source, reverify_count,
            checked_in_at, last_seen_at, feedback_rating, feedback_comment, feedback_submitted_at
     FROM freshers_checkins
     WHERE roll_no = $1
     LIMIT 1`,
    [rollNo]
  );
  return rows[0] || null;
}

async function insertCheckin({ rollNo, fullName, firstName, entrySource }) {
  const pool = await ensureSchema();
  const { rows } = await pool.query(
    `INSERT INTO freshers_checkins (roll_no, full_name, first_name, entry_source)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (roll_no) DO NOTHING
     RETURNING id, roll_no, full_name, first_name, entry_source, reverify_count,
               checked_in_at, last_seen_at, feedback_rating, feedback_comment, feedback_submitted_at`,
    [rollNo, fullName, firstName, entrySource]
  );
  return rows[0] || null;
}

async function touchReverify(rollNo) {
  const pool = await ensureSchema();
  const { rows } = await pool.query(
    `UPDATE freshers_checkins
     SET reverify_count = reverify_count + 1,
         last_seen_at = NOW()
     WHERE roll_no = $1
     RETURNING id, roll_no, full_name, first_name, entry_source, reverify_count,
               checked_in_at, last_seen_at, feedback_rating, feedback_comment, feedback_submitted_at`,
    [rollNo]
  );
  return rows[0] || null;
}

async function saveStudentFeedback({ rollNo, rating, comment }) {
  const pool = await ensureSchema();
  const { rows } = await pool.query(
    `UPDATE freshers_checkins
     SET feedback_rating = $2,
         feedback_comment = $3,
         feedback_submitted_at = COALESCE(feedback_submitted_at, NOW()),
         last_seen_at = NOW()
     WHERE roll_no = $1
     RETURNING id, roll_no, full_name, first_name, feedback_rating, feedback_comment, feedback_submitted_at`,
    [rollNo, rating, comment]
  );
  return rows[0] || null;
}

async function upsertAdminOverride({ rollNo, fullName, firstName, overwriteExisting }) {
  const pool = await ensureSchema();
  if (overwriteExisting) {
    const { rows } = await pool.query(
      `INSERT INTO freshers_checkins (roll_no, full_name, first_name, entry_source)
       VALUES ($1, $2, $3, 'admin_override')
       ON CONFLICT (roll_no) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         first_name = EXCLUDED.first_name,
         entry_source = 'admin_override',
         last_seen_at = NOW()
       RETURNING id, roll_no, full_name, first_name, entry_source, reverify_count,
                 checked_in_at, last_seen_at, feedback_rating, feedback_comment, feedback_submitted_at`,
      [rollNo, fullName, firstName]
    );
    return { record: rows[0], action: 'upserted' };
  }

  const inserted = await insertCheckin({
    rollNo,
    fullName,
    firstName,
    entrySource: 'admin_override'
  });
  if (inserted) {
    return { record: inserted, action: 'inserted' };
  }
  const existing = await findByRollNo(rollNo);
  return { record: existing, action: 'exists' };
}

async function listAllCheckins() {
  const pool = await ensureSchema();
  const { rows } = await pool.query(
    `SELECT id, roll_no, full_name, first_name, entry_source, reverify_count,
            checked_in_at, last_seen_at, feedback_rating, feedback_comment, feedback_submitted_at
     FROM freshers_checkins
     ORDER BY LOWER(full_name) ASC, roll_no ASC`
  );
  return rows;
}

async function deleteByRollNo(rollNo) {
  const pool = await ensureSchema();
  const { rows } = await pool.query(
    `DELETE FROM freshers_checkins
     WHERE roll_no = $1
     RETURNING roll_no`,
    [rollNo]
  );
  return rows.length > 0;
}

module.exports = {
  DEFAULT_FEEDBACK_UNLOCK_AT,
  getFeedbackUnlockAt,
  setFeedbackUnlockAt,
  findByRollNo,
  insertCheckin,
  touchReverify,
  saveStudentFeedback,
  upsertAdminOverride,
  listAllCheckins,
  deleteByRollNo
};
