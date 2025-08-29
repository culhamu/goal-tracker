'use strict';

function safeString(s, max = 256) {
  if (typeof s !== 'string') return null;
  return s.length > max ? s.slice(0, max) : s;
}
function clampNumber(n, min, max) {
  if (typeof n !== 'number' || Number.isNaN(n)) return null;
  return Math.max(min, Math.min(max, n));
}
function toIso(d) {
  try { return new Date(d).toISOString(); } catch { return null; }
}

module.exports = { safeString, clampNumber, toIso };
