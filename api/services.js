'use strict';
/**
 * Servis katmanı: CRUD ve ortak listeleme; router’dan bağımsız iş mantığı.
 */
const { getDb } = require('../database');

function list(table, userId, { page, limit, sort, from, to, q }, fields = ['*'], dateField = 'createdAt') {
  const db = getDb();
  const where = ['userId = ?'];
  const params = [userId];

  if (from) { where.push(`${dateField} >= ?`); params.push(from); }
  if (to) { where.push(`${dateField} <= ?`); params.push(to); }
  if (q) { where.push(`(note LIKE ? OR type LIKE ? OR mood LIKE ?)`); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }

  const order = sort.startsWith('-') ? `${sort.slice(1)} DESC` : `${sort} ASC`;
  const whereSql = `WHERE ${where.join(' AND ')}`;
  const sql = `SELECT ${fields.join(', ')} FROM ${table} ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`;
  const rows = db.prepare(sql).all(...params, limit, (page-1)*limit);
  const total = db.prepare(`SELECT COUNT(*) as c FROM ${table} ${whereSql}`).get(...params).c;
  return { page, limit, total, items: rows };
}

module.exports = { list };
