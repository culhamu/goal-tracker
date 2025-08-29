'use strict';
/**
 * Express yönlendirmeleri: auth, track, events, insights
 */
const { Router } = require('express');
const { v4: uuid } = require('uuid');

const { getDb } = require('./database');
const { hashPassword, verifyPassword, signToken, authRequired, requireRole } = require('./auth');
const { validate, schemas, sanitizeQuery } = require('./utils/validate');
const { safeString } = require('./utils/format');
const { analyticsService } = require('./api');

const router = Router();

// --- AUTH ---
router.post('/register', async (req, res) => {
  const body = req.body || {};
  const v = validate(schemas.register, body);
  if (!v.ok) return res.status(400).json({ error: v.error });

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(body.email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already exists' });

  const id = uuid();
  const passwordHash = await hashPassword(body.password);
  db.prepare('INSERT INTO users (id, email, passwordHash, role, createdAt) VALUES (?,?,?,?,?)')
    .run(id, body.email.toLowerCase(), passwordHash, body.role || 'user', new Date().toISOString());

  res.status(201).json({ id, email: body.email, role: body.role || 'user' });
});

router.post('/login', async (req, res) => {
  const body = req.body || {};
  const v = validate(schemas.login, body);
  if
