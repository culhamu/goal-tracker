'use strict';
const Database = require('better-sqlite3');
const path = require('path');

let db;

function initDb() {
  const dbPath = path.join(__dirname, 'health.sqlite');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt TEXT NOT NULL
    );

    -- Vitals: heartRate, systolic, diastolic, spo2, temp, mood
    CREATE TABLE IF NOT EXISTS vitals (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      heartRate INTEGER,
      systolic INTEGER,
      diastolic INTEGER,
      spo2 INTEGER,
      temperature REAL,
      mood TEXT,
      note TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Workouts
    CREATE TABLE IF NOT EXISTS workouts (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      durationMin INTEGER NOT NULL,
      calories REAL,
      distanceKm REAL,
      intensity TEXT,
      note TEXT,
      startedAt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Sleep
    CREATE TABLE IF NOT EXISTS sleep (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      start TEXT NOT NULL,
      end TEXT NOT NULL,
      quality INTEGER, -- 1-5
      awakenings INTEGER,
      note TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Meals (nutrition)
    CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      whenAt TEXT NOT NULL,
      mealType TEXT, -- breakfast/lunch/dinner/snack
      calories REAL,
      protein REAL,
      carbs REAL,
      fat REAL,
      note TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Measurements (weight, bodyFat, waist, etc.)
    CREATE TABLE IF NOT EXISTS measurements (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      weightKg REAL,
      bodyFatPct REAL,
      waistCm REAL,
      hipCm REAL,
      note TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Goals
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      metric TEXT,   -- e.g. "weightKg" or "weeklyWorkout"
      target REAL,
      dueDate TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Reminders
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      at TEXT NOT NULL,
      repeatRule TEXT, -- e.g. "daily", "weekly"
      note TEXT,
      sent INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_vitals_user_created ON vitals(userId, createdAt);
    CREATE INDEX IF NOT EXISTS idx_workouts_user_started ON workouts(userId, startedAt);
    CREATE INDEX IF NOT EXISTS idx_sleep_user_start ON sleep(userId, start);
    CREATE INDEX IF NOT EXISTS idx_meals_user_when ON meals(userId, whenAt);
    CREATE INDEX IF NOT EXISTS idx_measure_user_created ON measurements(userId, createdAt);
  `);
}

function getDb() {
  if (!db) throw new Error('DB not initialized');
  return db;
}

module.exports = { initDb, getDb };
