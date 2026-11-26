'use strict';

const {
  STUDENT_COOKIE,
  parseCookies,
  verifyToken,
  sendJson,
  readJsonBody
} = require('./_lib/auth');
const {
  findByRollNo,
  getFeedbackUnlockAt,
  saveStudentFeedback
} = require('./_lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const cookies = parseCookies(req);
    const payload = verifyToken(cookies[STUDENT_COOKIE]);
    if (!payload || payload.role !== 'fresher' || !payload.rollNo) {
      return sendJson(res, 401, {
        ok: false,
        error: 'Please check in with your Name and Roll Number first.'
      });
    }

    const unlockIso = await getFeedbackUnlockAt();
    if (Date.now() < Date.parse(unlockIso)) {
      return sendJson(res, 403, {
        ok: false,
        error: 'Feedback is still locked until the scheduled unlock time.',
        feedbackUnlockAt: unlockIso,
        serverNow: new Date().toISOString()
      });
    }

    const existing = await findByRollNo(payload.rollNo);
    if (!existing) {
      return sendJson(res, 404, { ok: false, error: 'Student check-in record not found.' });
    }

    const body = await readJsonBody(req);
    const rating = Number(body.rating);
    const comment = String(body.comment || '').trim().slice(0, 500);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return sendJson(res, 400, { ok: false, error: 'Please select a star rating between 1 and 5.' });
    }
    if (comment.length < 3) {
      return sendJson(res, 400, { ok: false, error: 'Please write a short feedback note (at least 3 characters).' });
    }

    const updated = await saveStudentFeedback({
      rollNo: existing.roll_no,
      rating,
      comment
    });

    return sendJson(res, 200, {
      ok: true,
      rating: updated.feedback_rating,
      submittedAt: updated.feedback_submitted_at
    });
  } catch (err) {
    console.error('Feedback error:', err);
    return sendJson(res, 500, { ok: false, error: 'Unable to save feedback right now.' });
  }
};
