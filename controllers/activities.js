'use strict';
const { v4: uuid } = require('uuid');
const { getDb } = require('../database');
const { validate, schemas } = require('../utils/validate');

function create(req, res) {
  const v = validate(schemas.activityCreate, req.body || {});
  if (!v.ok) return res.status(400).json({ error: v.error });

  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO activities (id,userId,type,durationMin,calories,note,createdAt)
    VALUES (?,?,?,?,?,?,?)
  `).run(
    id,
    req.user.sub,
    String(req.body.type).slice(0, 32),
    +req.body.durationMin,
    +req.body.calories,
    req.body.note ? String(req.body.note).slice(0, 512) : null,
    now
  );

  res.status(201).json({ id, createdAt: now });
}

function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  let limit = Math.max(1, parseInt(req.query.limit || '50', 10));
  limit = Math.min(limit, 200);
  const sort = (req.query.sort || '-createdAt');
  const order = sort.startsWith('-') ? `${sort.slice(1)} DESC` : `${sort} ASC`;

  const db = getDb();
  const items = db.prepare(`
    SELECT id,type,durationMin,calories,note,createdAt
    FROM activities
    WHERE userId = ?
    ORDER BY ${order}
    LIMIT ? OFFSET ?
  `).all(req.user.sub, limit, (page-1)*limit);

  const total = db.prepare(`SELECT COUNT(*) c FROM activities WHERE userId = ?`).get(req.user.sub).c;
  res.json({ page, limit, total, items });
}

function remove(req, res) {
  const db = getDb();
  const info = db.prepare(`DELETE FROM activities WHERE id = ? AND userId = ?`).run(req.params.id, req.user.sub);
  if (!info.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok:true });
}

module.exports = { create, list, remove };
