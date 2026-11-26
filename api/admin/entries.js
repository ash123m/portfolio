'use strict';

const {
  ADMIN_COOKIE,
  parseCookies,
  verifyToken,
  normalizeRollNo,
  sendJson
} = require('../_lib/auth');
const { listAllCheckins, deleteByRollNo, getFeedbackUnlockAt } = require('../_lib/db');

function requireAdmin(req) {
  const cookies = parseCookies(req);
  const payload = verifyToken(cookies[ADMIN_COOKIE]);
  return Boolean(payload && payload.role === 'admin');
}

module.exports = async function handler(req, res) {
  if (!requireAdmin(req)) {
    return sendJson(res, 401, { ok: false, error: 'Coordinator PIN required.' });
  }

  try {
    if (req.method === 'GET') {
      const [rows, feedbackUnlockAt] = await Promise.all([
        listAllCheckins(),
        getFeedbackUnlockAt()
      ]);
      return sendJson(res, 200, {
        ok: true,
        entries: rows,
        feedbackUnlockAt,
        serverNow: new Date().toISOString()
      });
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url, 'http://localhost');
      const rollNo = normalizeRollNo(url.searchParams.get('rollNo'));
      if (!rollNo) {
        return sendJson(res, 400, { ok: false, error: 'Roll Number is required.' });
      }
      const removed = await deleteByRollNo(rollNo);
      return sendJson(res, 200, { ok: true, removed });
    }

    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin entries error:', err);
    return sendJson(res, 500, { ok: false, error: 'Database error.' });
  }
};
