'use strict';

const crypto = require('node:crypto');
const {
  ADMIN_COOKIE,
  getAdminPin,
  signPayload,
  setCookie,
  sendJson,
  readJsonBody
} = require('../_lib/auth');
const { listAllCheckins, getFeedbackUnlockAt } = require('../_lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req);
    const submittedPin = String(body.pin || '').trim();
    const expectedPin = getAdminPin();

    const subBuf = Buffer.from(submittedPin, 'utf8');
    const expBuf = Buffer.from(expectedPin, 'utf8');

    if (subBuf.length !== expBuf.length || !crypto.timingSafeEqual(subBuf, expBuf)) {
      return sendJson(res, 401, { ok: false, error: 'Invalid Coordinator PIN.' });
    }

    const token = signPayload({
      role: 'admin',
      exp: Date.now() + 12 * 60 * 60 * 1000
    });
    setCookie(res, ADMIN_COOKIE, token, req, 12 * 60 * 60);

    // Return initial entries + timer in the same round-trip for faster unlock
    const [entries, feedbackUnlockAt] = await Promise.all([
      listAllCheckins(),
      getFeedbackUnlockAt()
    ]);

    return sendJson(res, 200, {
      ok: true,
      entries,
      feedbackUnlockAt,
      serverNow: new Date().toISOString()
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return sendJson(res, 500, { ok: false, error: 'Server error during sign-in.' });
  }
};
