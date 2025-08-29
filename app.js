'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

const { initDb } = require('./database');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: false }));
app.use(express.json({ limit: '1.5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Rate limit sadece API için
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true
});
app.use('/api', limiter);

// DB init
try {
  initDb();
  console.log('SQLite initialized');
} catch (e) {
  console.error('DB init failed:', e);
  process.exit(1);
}

// Sağlık ucu
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'HealthTrack Pro API', version: '1.2.0', ts: new Date().toISOString() });
});

// Statik servis (front için index.html, style.css, index.js, tracker.js vs.)
app.use('/', express.static(__dirname));

// Ana router
app.use('/api', routes);

// Global hata yakalayıcı
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Error' });
});

app.listen(PORT, () => {
  console.log(`API listening at http://localhost:${PORT}`);
});
