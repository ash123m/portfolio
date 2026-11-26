'use strict';

const { ADMIN_COOKIE, setCookie, sendJson } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'Method not allowed' });
  }
  setCookie(res, ADMIN_COOKIE, '', req, 0);
  return sendJson(res, 200, { ok: true });
};
