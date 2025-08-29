'use strict';
const { Router } = require('express');
const { v4: uuid } = require('uuid');

const { getDb } = require('./database');
const { hashPassword, verifyPassword, signToken, authRequired, requireRole } = require('./auth');
const { validate, sanitizeListQuery, schemas } = require('./utils/validate');
const { safeString } = require('./utils/format');
const { list } = require('./api/services');
const { overview, trends } = require('./api/insights');

const router = Router();

/* ---------- AUTH ---------- */
router.post('/register', async (req, res) => {
  const v = validate(schemas.register, req.body || {});
  if (!v.ok) return res.status(400).json({ error: v.error });
  const db = getDb();
  const email = req.body.email.toLowerCase();
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'Email already exists' });
  const id = uuid();
  const passwordHash = await hashPassword(req.body.password);
  db.prepare('INSERT INTO users (id,email,passwordHash,role,createdAt) VALUES (?,?,?,?,?)')
    .run(id, email, passwordHash, req.body.role || 'user', new Date().toISOString());
  res.status(201).json({ id, email, role: req.body.role || 'user' });
});

router.post('/login', async (req, res) => {
  const v = validate(schemas.login, req.body || {});
  if (!v.ok) return res.status(400).json({ error: v.error });
  const db = getDb();
  const email = req.body.email.toLowerCase();
  const row = db.prepare('SELECT id,email,passwordHash,role FROM users WHERE email = ?').get(email);
  if (!row) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await verifyPassword(req.body.password, row.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken({ sub: row.id, email: row.email, role: row.role });
  res.json({ token, user: { id: row.id, email: row.email, role: row.role } });
});

/* ---------- VITALS ---------- */
router.post('/vitals', authRequired, (req, res) => {
  const v = validate(schemas.vitalCreate, req.body || {});
  if (!v.ok) return res.status(400).json({ error: v.error });
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO vitals (id,userId,heartRate,systolic,diastolic,spo2,temperature,mood,note,createdAt)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, req.user.sub, req.body.heartRate ?? null, req.body.systolic ?? null, req.body.diastolic ?? null,
    req.body.spo2 ?? null, req.body.temperature ?? null, safeString(req.body.mood,32),
    safeString(req.body.note,512), req.body.createdAt || new Date().toISOString()
  );
  res.status(201).json({ id });
});
router.get('/vitals', authRequired, (req, res) => {
  const q = sanitizeListQuery(req.query || {});
  const out = list('vitals', req.user.sub, q, ['id,heartRate,systolic,diastolic,spo2,temperature,mood,note,createdAt']);
  res.json(out);
});

/* ---------- WORKOUTS ---------- */
router.post('/workouts', authRequired, (req, res) => {
  const v = validate(schemas.workoutCreate, req.body || {});
  if (!v.ok) return res.status(400).json({ error: v.error });
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO workouts (id,userId,type,durationMin,calories,distanceKm,intensity,note,startedAt,createdAt)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, req.user.sub, req.body.type, req.body.durationMin,
    req.body.calories ?? null, req.body.distanceKm ?? null, safeString(req.body.intensity,16),
    safeString(req.body.note,512), req.body.startedAt, new Date().toISOString()
  );
  res.status(201).json({ id });
});
router.get('/workouts', authRequired, (req, res) => {
  const q = sanitizeListQuery(req.query || {});
  const out = list('workouts', req.user.sub, q, ['id,type,durationMin,calories,distanceKm,intensity,note,startedAt,createdAt'], 'startedAt');
  res.json(out);
});

/* ---------- SLEEP ---------- */
router.post('/sleep', authRequired, (req, res) => {
  const v = validate(schemas.sleepCreate, req.body || {});
  if (!v.ok) return res.status(400).json({ error: v.error });
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO sleep (id,userId,start,end,quality,awakenings,note,createdAt)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(
    id, req.user.sub, req.body.start, req.body.end, req.body.quality ?? null,
    req.body.awakenings ?? null, safeString(req.body.note,512), new Date().toISOString()
  );
  res.status(201).json({ id });
});
router.get('/sleep', authRequired, (req, res) => {
  const q = sanitizeListQuery(req.query || {});
  const out = list('sleep', req.user.sub, q, ['id,start,end,quality,awakenings,note,createdAt'], 'start');
  res.json(out);
});

/* ---------- MEALS ---------- */
router.post('/meals', authRequired, (req, res) => {
  const v = validate(schemas.mealCreate, req.body || {});
  if (!v.ok) return res.status(400).json({ error: v.error });
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO meals (id,userId,whenAt,mealType,calories,protein,carbs,fat,note,createdAt)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `).run(
    id, req.user.sub, req.body.whenAt, safeString(req.body.mealType,16),
    req.body.calories ?? null, req.body.protein ?? null, req.body.carbs ?? null, req.body.fat ?? null,
    safeString(req.body.note,512), new Date().toISOString()
  );
  res.status(201).json({ id });
});
router.get('/meals', authRequired, (req, res) => {
  const q = sanitizeListQuery(req.query || {});
  const out = list('meals', req.user.sub, q, ['id,whenAt,mealType,calories,protein,carbs,fat,note,createdAt'], 'whenAt');
  res.json(out);
});

/* ---------- MEASUREMENTS ---------- */
router.post('/measurements', authRequired, (req, res) => {
  const v = validate(schemas.measureCreate, req.body || {});
  if (!v.ok) return res.status(400).json({ error: v.error });
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO measurements (id,userId,weightKg,bodyFatPct,waistCm,hipCm,note,createdAt)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(
    id, req.user.sub, req.body.weightKg ?? null, req.body.bodyFatPct ?? null, req.body.waistCm ?? null,
    req.body.hipCm ?? null, safeString(req.body.note,512), req.body.createdAt || new Date().toISOString()
  );
  res.status(201).json({ id });
});
router.get('/measurements', authRequired, (req, res) => {
  const q = sanitizeListQuery(req.query || {});
  const out = list('measurements', req.user.sub, q, ['id,weightKg,bodyFatPct,waistCm,hipCm,note,createdAt']);
  res.json(out);
});

/* ---------- GOALS ---------- */
router.post('/goals', authRequired, (req, res) => {
  const v = validate(schemas.goalCreate, req.body || {});
  if (!v.ok) return res.status(400).json({ error: v.error });
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO goals (id,userId,title,metric,target,dueDate,completed,createdAt)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(
    id, req.user.sub, req.body.title, req.body.metric ?? null, req.body.target ?? null, req.body.dueDate ?? null, 0, new Date().toISOString()
  );
  res.status(201).json({ id });
});
router.get('/goals', authRequired, (req, res) => {
  const q = sanitizeListQuery(req.query || {});
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM goals WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?`)
    .all(req.user.sub, q.limit, (q.page-1)*q.limit);
  const total = db.prepare(`SELECT COUNT(*) c FROM goals WHERE userId = ?`).get(req.user.sub).c;
  res.json({ page:q.page, limit:q.limit, total, items: rows });
});
router.patch('/goals/:id/complete', authRequired, (req, res) => {
  const db = getDb();
  const info = db.prepare(`UPDATE goals SET completed = 1 WHERE id = ? AND userId = ?`).run(req.params.id, req.user.sub);
  if (!info.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok:true });
});

/* ---------- REMINDERS ---------- */
router.post('/reminders', authRequired, (req, res) => {
  const v = validate(schemas.reminderCreate, req.body || {});
  if (!v.ok) return res.status(400).json({ error: v.error });
  const db = getDb();
  const id = uuid();
  db.prepare(`
    INSERT INTO reminders (id,userId,title,at,repeatRule,note,createdAt)
    VALUES (?,?,?,?,?,?,?)
  `).run(
    id, req.user.sub, req.body.title, req.body.at, req.body.repeatRule ?? null, safeString(req.body.note,512),
    new Date().toISOString()
  );
  res.status(201).json({ id });
});
router.get('/reminders', authRequired, (req, res) => {
  const q = sanitizeListQuery(req.query || {});
  const out = list('reminders', req.user.sub, q, ['id,title,at,repeatRule,note,createdAt'], 'at');
  res.json(out);
});

/* ---------- INSIGHTS ---------- */
router.get('/insights/overview', authRequired, (req, res) => {
  const out = overview(req.user.sub, { from: req.query.from, to: req.query.to });
  res.json(out);
});
router.get('/insights/trends', authRequired, (req, res) => {
  const limit = Math.min(60, Math.max(7, parseInt(req.query.limit || '30', 10)));
  const out = trends(req.user.sub, { limit });
  res.json(out);
});

/* ---------- ADMIN ---------- */
router.delete('/admin/user/:userId', authRequired, requireRole('admin'), (req, res) => {
  const db = getDb();
  const info = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.userId);
  res.json({ deleted: !!info.changes });
});

module.exports = { router };
