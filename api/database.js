'use strict';
/**
 * better-sqlite3 ile basit veritabanı ve şema yönetimi.
 */
const Database = require('better-sqlite3');
const path = require('path');

let db;

function initDb() {
  const dbPath = path.join(__dirname, 'data.sqlite');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      route TEXT,
      payload TEXT NOT NULL,
      userId TEXT,
      ip TEXT,
      ua TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_events_createdAt ON events(createdAt);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    CREATE INDEX IF NOT EXISTS idx_events_route ON events(route);
  `);
}

function getDb() {
  if (!db) throw new Error('DB not initialized');
  return db;
}

module.exports = { initDb, getDb };
