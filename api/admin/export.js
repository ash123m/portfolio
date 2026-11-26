'use strict';

const {
  ADMIN_COOKIE,
  parseCookies,
  verifyToken,
  sendJson
} = require('../_lib/auth');
const { listAllCheckins } = require('../_lib/db');

function csvEscape(val) {
  const str = String(val ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatIST(iso) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return String(iso || '');
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }

  const cookies = parseCookies(req);
  const payload = verifyToken(cookies[ADMIN_COOKIE]);
  if (!payload || payload.role !== 'admin') {
    return sendJson(res, 401, { ok: false, error: 'Coordinator PIN required.' });
  }

  try {
    const rows = await listAllCheckins();
    const header = [
      'Sl No',
      'Roll Number',
      'Full Name',
      'First Name',
      'Entry Source',
      'Re-Scans',
      'Checked In (IST)',
      'Feedback Rating (1-5)',
      'Feedback Comment',
      'Feedback Submitted (IST)'
    ];
    const lines = [header.map(csvEscape).join(',')];

    rows.forEach((row, index) => {
      lines.push(
        [
          index + 1,
          row.roll_no,
          row.full_name,
          row.first_name,
          row.entry_source === 'admin_override' ? 'Incharge Override' : 'QR Self-Scan',
          row.reverify_count,
          formatIST(row.checked_in_at),
          row.feedback_rating ? String(row.feedback_rating) : '',
          row.feedback_comment || '',
          row.feedback_submitted_at ? formatIST(row.feedback_submitted_at) : ''
        ]
          .map(csvEscape)
          .join(',')
      );
    });

    const csvBody = '\uFEFF' + lines.join('\r\n');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="poornaprajna-freshers-2026-attendance.csv"');
    res.end(csvBody);
  } catch (err) {
    console.error('Export CSV error:', err);
    return sendJson(res, 500, { ok: false, error: 'Failed to export CSV.' });
  }
};
