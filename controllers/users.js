'use strict';
const { v4: uuid } = require('uuid');
const { getDb } = require('../database');
const { validate, schemas } = require('../utils/validate');
const { hashPassword, verifyPassword, signToken } = require('../auth');

async function register(req, res) {
  const v = validate(schemas.register, req.body || {});
  if (!v.ok) return res.status(400).json({ error: v.error });
  const db = getDb();
  const email = req.body.email.toLowerCase();
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'Email already exists' });

  const id = uuid();
  const passwordHash = await hashPassword(req.body.password);
  db.prepare('INSERT INTO users (id,email,passwordHash,role,createdAt) VALUES (?,?,?,?,?)')
    .run(id, email, passwordHash, 'user', new Date().toISOString());
  res.status(201).json({ id, email });
}

async function login(req, res) {
  const v = validate(schemas.login, req.body || {});
  if (!v.ok) return res.status(400).json({ error: v.error });

  const db = getDb();
  const email = req.body.email.toLowerCase();
  const user = db.prepare('SELECT id,email,passwordHash,role FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await verifyPassword(req.body.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
}

module.exports = { register, login };
