'use strict';
/**
 * İçgörüler ve trendler: haftalık ortalamalar, HRV benzeri basit metrikler (temsilî),
 * hedef ilerlemeleri (tamamlanma oranı), uyku toplam/ortalama vb.
 */
const { getDb } = require('../database');

function avg(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }

function overview(userId, { from, to }) {
  const db = getDb();

  const vitals = db.prepare(`
    SELECT heartRate, systolic, diastolic, spo2, temperature, createdAt
    FROM vitals WHERE userId = ? ${from? 'AND createdAt >= ?':''} ${to? 'AND createdAt <= ?':''}
    ORDER BY createdAt DESC LIMIT 500
  `).all(...([userId].concat(from?[from]:[]).concat(to?[to]:[])));

  const workouts = db.prepare(`
    SELECT durationMin, calories, distanceKm, intensity, startedAt
    FROM workouts WHERE userId = ? ${from? 'AND startedAt >= ?':''} ${to? 'AND startedAt <= ?':''}
    ORDER BY startedAt DESC LIMIT 500
  `).all(...([userId].concat(from?[from]:[]).concat(to?[to]:[])));

  const sleep = db.prepare(`
    SELECT start, end, quality, awakenings
    FROM sleep WHERE userId = ? ${from? 'AND start >= ?':''} ${to? 'AND start <= ?':''}
    ORDER BY start DESC LIMIT 200
  `).all(...([userId].concat(from?[from]:[]).concat(to?[to]:[])));

  const meals = db.prepare(`
    SELECT calories, protein, carbs, fat, whenAt
    FROM meals WHERE userId = ? ${from? 'AND whenAt >= ?':''} ${to? 'AND whenAt <= ?':''}
    ORDER BY whenAt DESC LIMIT 500
  `).all(...([userId].concat(from?[from]:[]).concat(to?[to]:[])));

  // Basit özetler
  const hr = vitals.map(v=>v.heartRate).filter(Number.isFinite);
  const bpSys = vitals.map(v=>v.systolic).filter(Number.isFinite);
  const bpDia = vitals.map(v=>v.diastolic).filter(Number.isFinite);
  const spo2 = vitals.map(v=>v.spo2).filter(Number.isFinite);
  const temp = vitals.map(v=>v.temperature).filter(Number.isFinite);

  const workoutDur = workouts.map(w=>w.durationMin).filter(Number.isFinite);
  const workoutCal = workouts.map(w=>w.calories).filter(Number.isFinite);

  const sleepDur = sleep.map(s=> (new Date(s.end)-new Date(s.start))/3600000 ).filter(n=>n>0);
  const sleepQual = sleep.map(s=>s.quality).filter(Number.isFinite);

  const mealCal = meals.map(m=>m.calories).filter(Number.isFinite);
  const protein = meals.map(m=>m.protein).filter(Number.isFinite);
  const carbs = meals.map(m=>m.carbs).filter(Number.isFinite);
  const fat = meals.map(m=>m.fat).filter(Number.isFinite);

  return {
    vitals: {
      avgHeartRate: Math.round(avg(hr)),
      avgBP: { systolic: Math.round(avg(bpSys)), diastolic: Math.round(avg(bpDia)) },
      avgSpO2: Math.round(avg(spo2)),
      avgTemp: Number(avg(temp).toFixed(1))
    },
    workouts: {
      sessions: workouts.length,
      totalMinutes: Math.round(workoutDur.reduce((a,b)=>a+b,0)),
      totalCalories: Math.round(workoutCal.reduce((a,b)=>a+b,0))
    },
    sleep: {
      entries: sleep.length,
      avgHours: Number(avg(sleepDur).toFixed(2)),
      avgQuality: Number(avg(sleepQual).toFixed(2))
    },
    nutrition: {
      days: new Set(meals.map(m=>m.whenAt.slice(0,10))).size,
      totalCalories: Math.round(mealCal.reduce((a,b)=>a+b,0)),
      avgProtein: Number(avg(protein).toFixed(1)),
      avgCarbs: Number(avg(carbs).toFixed(1)),
      avgFat: Number(avg(fat).toFixed(1))
    }
  };
}

function trends(userId, { limit=30 } = {}) {
  const db = getDb();

  // Günlük kalp atımı ortalaması
  const heart = db.prepare(`
    SELECT substr(createdAt,1,10) as day, ROUND(AVG(heartRate),1) as avgHR, COUNT(*) as c
    FROM vitals WHERE userId = ? AND heartRate IS NOT NULL
    GROUP BY day ORDER BY day DESC LIMIT ?
  `).all(userId, limit).reverse();

  // Günlük uyku toplam saat
  const sleep = db.prepare(`
    SELECT substr(start,1,10) as day, ROUND( (SUM((julianday(end)-julianday(start))*24)), 2 ) as hours
    FROM sleep WHERE userId = ?
    GROUP BY day ORDER BY day DESC LIMIT ?
  `).all(userId, limit).reverse();

  // Haftalık toplam egzersiz süresi
  const workouts = db.prepare(`
    SELECT substr(startedAt,1,10) as day, SUM(durationMin) as totalMin
    FROM workouts WHERE userId = ?
    GROUP BY day ORDER BY day DESC LIMIT ?
  `).all(userId, limit).reverse();

  return { heart, sleep, workouts };
}

module.exports = { overview, trends };
