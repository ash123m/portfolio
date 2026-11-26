'use strict';

const {
  STUDENT_COOKIE,
  parseCookies,
  verifyToken,
  sendJson
} = require('./_lib/auth');
const { findByRollNo, getFeedbackUnlockAt } = require('./_lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const feedbackUnlockAt = await getFeedbackUnlockAt();
    const serverNow = new Date().toISOString();

    const cookies = parseCookies(req);
    const token = cookies[STUDENT_COOKIE];
    const payload = verifyToken(token);

    if (!payload || payload.role !== 'fresher' || !payload.rollNo) {
      return sendJson(res, 200, {
        checkedIn: false,
        feedbackUnlockAt,
        serverNow
      });
    }

    const record = await findByRollNo(payload.rollNo);
    if (!record) {
      return sendJson(res, 200, {
        checkedIn: false,
        feedbackUnlockAt,
        serverNow
      });
    }

    return sendJson(res, 200, {
      checkedIn: true,
      name: record.full_name,
      firstName: record.first_name,
      feedbackUnlockAt,
      serverNow,
      feedbackSubmitted: Boolean(record.feedback_submitted_at),
      feedbackRating: record.feedback_rating || null
    });
  } catch (err) {
    console.error('Session error:', err);
    return sendJson(res, 500, { ok: false, error: 'Server configuration error.' });
  }
};
