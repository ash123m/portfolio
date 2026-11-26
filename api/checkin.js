'use strict';

const {
  STUDENT_COOKIE,
  parseCookies,
  signPayload,
  verifyToken,
  setCookie,
  normalizeRollNo,
  normalizeName,
  extractFirstName,
  namesMatch,
  sendJson,
  readJsonBody
} = require('./_lib/auth');
const {
  findByRollNo,
  insertCheckin,
  touchReverify,
  getFeedbackUnlockAt
} = require('./_lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req);

    // Silent honeypot check against automated bots
    if (body.website) {
      return sendJson(res, 400, { ok: false, error: 'Invalid submission.' });
    }

    const fullName = normalizeName(body.name);
    const rollNo = normalizeRollNo(body.rollNo);

    if (fullName.length < 2 || fullName.length > 80) {
      return sendJson(res, 400, { ok: false, error: 'Please enter your full name (2–80 characters).' });
    }

    if (!/^261\d{2}$/.test(rollNo)) {
      return sendJson(res, 400, {
        ok: false,
        error: 'Roll Number must be a 5-digit number starting with 261 (e.g. 26101).'
      });
    }

    // If this device already holds a valid fresher pass cookie, return their own record (1 device = 1 pass)
    const cookies = parseCookies(req);
    const existingToken = verifyToken(cookies[STUDENT_COOKIE]);
    if (existingToken && existingToken.role === 'fresher' && existingToken.rollNo) {
      const ownRecord = await findByRollNo(existingToken.rollNo);
      if (ownRecord && ownRecord.roll_no !== rollNo) {
        return sendJson(res, 200, {
          ok: true,
          status: 'device_locked',
          name: ownRecord.full_name,
          firstName: ownRecord.first_name
        });
      }
    }

    const firstName = extractFirstName(fullName);
    const inserted = await insertCheckin({
      rollNo,
      fullName,
      firstName,
      entrySource: 'qr_self'
    });

    if (inserted) {
      const feedbackUnlockAt = await getFeedbackUnlockAt();
      const token = signPayload({
        role: 'fresher',
        rollNo: inserted.roll_no,
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000
      });
      setCookie(res, STUDENT_COOKIE, token, req);
      return sendJson(res, 200, {
        ok: true,
        status: 'checked_in',
        name: inserted.full_name,
        firstName: inserted.first_name,
        feedbackUnlockAt,
        serverNow: new Date().toISOString(),
        feedbackSubmitted: false,
        feedbackRating: null
      });
    }

    // Roll No already exists -> handle cleared site data / rescan automatically if name matches
    const existing = await findByRollNo(rollNo);
    if (!existing) {
      return sendJson(res, 500, { ok: false, error: 'Unable to complete check-in. Please try again.' });
    }

    if (!namesMatch(existing.full_name, fullName)) {
      return sendJson(res, 409, {
        ok: false,
        error: 'This Roll Number is already registered under a different name. Please check your Roll No or ask the MCA coordinator.'
      });
    }

    const updated = (await touchReverify(rollNo)) || existing;
    const feedbackUnlockAt = await getFeedbackUnlockAt();
    const token = signPayload({
      role: 'fresher',
      rollNo: updated.roll_no,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000
    });
    setCookie(res, STUDENT_COOKIE, token, req);

    return sendJson(res, 200, {
      ok: true,
      status: 'reverified',
      name: updated.full_name,
      firstName: updated.first_name,
      feedbackUnlockAt,
      serverNow: new Date().toISOString(),
      feedbackSubmitted: Boolean(updated.feedback_submitted_at),
      feedbackRating: updated.feedback_rating || null
    });
  } catch (err) {
    console.error('Check-in error:', err);
    const detail = err?.publicCode || err?.code || '';
    const msg = detail
      ? `Server error while saving check-in (${detail}).`
      : 'Server error while saving check-in.';
    return sendJson(res, 500, { ok: false, error: msg });
  }
};
