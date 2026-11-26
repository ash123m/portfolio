'use strict';

const crypto = require('node:crypto');

const STUDENT_COOKIE = 'pim_fresher_pass';
const ADMIN_COOKIE = 'pim_admin_session';

function getSecret() {
  return process.env.COOKIE_SECRET || 'dev-only-change-cookie-secret-in-vercel-env';
}

function getAdminPin() {
  return process.env.ADMIN_PIN || '202600';
}

function parseCookies(req) {
  const header = req.headers?.cookie || '';
  const out = {};
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  });
  return out;
}

function signPayload(payloadObj) {
  const json = JSON.stringify(payloadObj);
  const body = Buffer.from(json, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0) return null;

  const body = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  const expectedSig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isHttpsRequest(req) {
  const proto = req.headers?.['x-forwarded-proto'];
  if (proto) return proto.split(',')[0].trim() === 'https';
  return Boolean(process.env.VERCEL);
}

function buildCookieHeader(name, value, req, maxAgeSeconds = 2592000) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`
  ];
  if (isHttpsRequest(req)) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function setCookie(res, name, value, req, maxAgeSeconds = 2592000) {
  const nextCookie = buildCookieHeader(name, value, req, maxAgeSeconds);
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', nextCookie);
  } else if (Array.isArray(existing)) {
    res.setHeader('Set-Cookie', [...existing, nextCookie]);
  } else {
    res.setHeader('Set-Cookie', [existing, nextCookie]);
  }
}

function normalizeRollNo(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]+/g, '');
}

function normalizeName(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function extractFirstName(fullName) {
  const clean = normalizeName(fullName);
  if (!clean) return 'Fresher';
  return clean.split(' ')[0];
}

function namesMatch(existingFullName, incomingFullName) {
  const a = normalizeName(existingFullName).toLowerCase().replace(/[^a-z0-9 ]/g, '');
  const b = normalizeName(incomingFullName).toLowerCase().replace(/[^a-z0-9 ]/g, '');
  if (!a || !b) return false;
  if (a === b) return true;
  const firstA = a.split(' ')[0];
  const firstB = b.split(' ')[0];
  return firstA.length >= 2 && firstA === firstB;
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return {};
  return JSON.parse(text);
}

module.exports = {
  STUDENT_COOKIE,
  ADMIN_COOKIE,
  getAdminPin,
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
};
