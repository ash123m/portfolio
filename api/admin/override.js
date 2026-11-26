'use strict';

const {
  ADMIN_COOKIE,
  parseCookies,
  verifyToken,
  normalizeRollNo,
  normalizeName,
  extractFirstName,
  sendJson,
  readJsonBody
} = require('../_lib/auth');
const { upsertAdminOverride } = require('../_lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const cookies = parseCookies(req);
  const payload = verifyToken(cookies[ADMIN_COOKIE]);
  if (!payload || payload.role !== 'admin') {
    return sendJson(res, 401, { ok: false, error: 'Coordinator PIN required.' });
  }

  try {
    const body = await readJsonBody(req);
    const fullName = normalizeName(body.name);
    const rollNo = normalizeRollNo(body.rollNo);
    const overwriteExisting = Boolean(body.overwriteExisting);

    if (fullName.length < 2 || fullName.length > 80) {
      return sendJson(res, 400, { ok: false, error: 'Please enter a valid student name.' });
    }
    if (!/^261\d{2}$/.test(rollNo)) {
      return sendJson(res, 400, { ok: false, error: 'Roll Number must be a 5-digit number starting with 261 (e.g. 26101).' });
    }

    const firstName = extractFirstName(fullName);
    const result = await upsertAdminOverride({
      rollNo,
      fullName,
      firstName,
      overwriteExisting
    });

    if (result.action === 'exists') {
      return sendJson(res, 409, {
        ok: false,
        error: `Roll No ${rollNo} already exists (${result.record.full_name}). Enable "Force Update" to overwrite.`
      });
    }

    return sendJson(res, 200, {
      ok: true,
      action: result.action,
      entry: result.record
    });
  } catch (err) {
    console.error('Admin override error:', err);
    return sendJson(res, 500, { ok: false, error: 'Database error saving override.' });
  }
};
