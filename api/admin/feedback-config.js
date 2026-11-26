'use strict';

const {
  ADMIN_COOKIE,
  parseCookies,
  verifyToken,
  sendJson,
  readJsonBody
} = require('../_lib/auth');
const { getFeedbackUnlockAt, setFeedbackUnlockAt } = require('../_lib/db');

module.exports = async function handler(req, res) {
  const cookies = parseCookies(req);
  const payload = verifyToken(cookies[ADMIN_COOKIE]);
  if (!payload || payload.role !== 'admin') {
    return sendJson(res, 401, { ok: false, error: 'Coordinator PIN required.' });
  }

  try {
    if (req.method === 'GET') {
      const feedbackUnlockAt = await getFeedbackUnlockAt();
      return sendJson(res, 200, {
        ok: true,
        feedbackUnlockAt,
        serverNow: new Date().toISOString()
      });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const raw = String(body.feedbackUnlockAt || '').trim();
      const parsedMs = Date.parse(raw);
      if (!raw || !Number.isFinite(parsedMs)) {
        return sendJson(res, 400, { ok: false, error: 'Please provide a valid date and time.' });
      }
      const saved = await setFeedbackUnlockAt(new Date(parsedMs).toISOString());
      return sendJson(res, 200, {
        ok: true,
        feedbackUnlockAt: saved,
        serverNow: new Date().toISOString()
      });
    }

    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  } catch (err) {
    console.error('Feedback config error:', err);
    return sendJson(res, 500, { ok: false, error: 'Unable to update feedback timer.' });
  }
};
