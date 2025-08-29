
---

## app.js
```js
'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

dotenv.config();

const { router } = require('./routes');
const { initDb } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({ origin: '*', methods: ['GET','POST','PATCH','DELETE'] }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true
});
app.use('/api', limiter);

// DB init & ready
let ready = false;
try {
  initDb();
  ready = true;
  console.log('DB initialized. Ready.');
} catch (e) {
  console.error('DB init failed', e);
  process.exit(1);
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, ready, version: '1.0.0', ts: new Date().toISOString() });
});

app.use('/', express.static(__dirname));
app.use('/api', router);

app.listen(PORT, () => {
  console.log(`HealthTrack Pro listening on http://localhost:${PORT}`);
});
