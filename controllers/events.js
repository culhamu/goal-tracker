'use strict';
/**
 * Tracker'dan gelen event'leri toplar (public endpoint).
 * Kimlik doğrulama GEREKMEZ; ancak rate limit ve veri kısıtları uygulanır.
 * İsteğe bağlı userId, sessionId alır.
 */
const { v4: uuid } = require('uuid');
const { getDb } = require('../database');

function cleanString(s, max=512) {
  if (typeof s !== 'string') return null;
  return s.slice(0, max);
}

function ingest(req, res) {
  const body = req.body || {};
  const events = Array.isArray(body.events) ? body.events : [];
  if (!events.length) return res.status(400).json({ error: 'No events' });

  const db = getDb();
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null;

  const stmt = db.prepare(`
    INSERT INTO events (id,userId,sessionId,event,props,userAgent,ip,createdAt)
    VALUES (?,?,?,?,?,?,?,?)
  `);
  const trx = db.transaction((rows) => {
    for (const e of rows) {
      const id = uuid();
      const createdAt = e.timestamp && !Number.isNaN(Date.parse(e.timestamp))
        ? new Date(e.timestamp).toISOString()
        : new Date().toISOString();
      stmt.run(
        id,
        e.userId || null,
        cleanString(e.sessionId, 64),
        cleanString(e.event, 64) || 'unknown',
        e.props ? JSON.stringify(e.props).slice(0, 2000) : null,
        cleanString(e.userAgent, 256),
        cleanString(ip, 64),
        createdAt
      );
    }
  });

  try {
    // Sert kısıtlar: toplam > 500 event olmasın, tek event props 2KB’ye kadar vs.
    if (events.length > 500) return res.status(413).json({ error: 'Too many events' });
    trx(events);
  } catch (e) {
    console.error('Event ingest error', e);
    return res.status(500).json({ error: 'Ingest failed' });
  }

  res.status(202).json({ accepted: events.length });
}

function list(req, res) {
  // Basit listeleme (admin yoksa: kendi userId’si olan kayıtları göstersin diye filtre ekleyebilirsiniz)
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  let limit = Math.max(1, parseInt(req.query.limit || '50', 10));
  limit = Math.min(limit, 200);
  const db = getDb();
  const rows = db.prepare(`
    SELECT id,userId,sessionId,event,props,userAgent,ip,createdAt
    FROM events
    ORDER BY createdAt DESC
    LIMIT ? OFFSET ?
  `).all(limit, (page-1)*limit);

  res.json({ page, limit, items: rows });
}

module.exports = { ingest, list };
