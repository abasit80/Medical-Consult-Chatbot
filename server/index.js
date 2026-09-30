require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase } = require('./db');
const openaiService = require('./openaiService');

async function createApp() {
  await initDatabase();

  const { router: authRouter } = require('./routes/auth');
  const chatRouter = require('./routes/chat');
  const reportsRouter = require('./routes/reports');

  const app = express();

  if (process.env.TRUST_PROXY === '1' || process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'MediConsult API',
      database: 'mysql',
      llm: openaiService.isConfigured()
        ? { provider: 'openai', model: openaiService.MODEL }
        : { provider: 'unconfigured', model: null },
      disclaimer: 'Informational only — not a substitute for professional medical care.'
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/reports', reportsRouter);

  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { index: false }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.status(503).send('Frontend not built. Upload client/dist (index.html + assets).');
    });
  }

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  });

  return app;
}

async function start() {
  try {
    const app = await createApp();
    const PORT = Number(process.env.PORT) || 4000;
    const HOST = process.env.HOST || '0.0.0.0';

    // Namecheap / cPanel Passenger
    if (typeof PhusionPassenger !== 'undefined') {
      // eslint-disable-next-line no-undef
      PhusionPassenger.configure({ autoInstall: false });
      app.listen('passenger');
      console.log('MediConsult running under Passenger');
      return app;
    }

    await new Promise((resolve, reject) => {
      const server = app.listen(PORT, HOST, () => {
        console.log(`MediConsult running on http://${HOST}:${PORT}`);
        resolve(server);
      });
      server.on('error', reject);
    });

    return app;
  } catch (err) {
    console.error('Startup error:', err);
    // Fallback mini-app so hosting shows a readable error instead of blank 503
    const app = express();
    app.get('*', (_req, res) => {
      res.status(503).type('html').send(`<!doctype html>
<html><body style="font-family:sans-serif;max-width:640px;margin:3rem auto;padding:0 1rem">
  <h1>MediConsult failed to start</h1>
  <p><strong>${String(err.message || err)}</strong></p>
  <p>Check: server/.env DB settings, npm install, and Node.js app logs in cPanel.</p>
</body></html>`);
    });

    if (typeof PhusionPassenger !== 'undefined') {
      // eslint-disable-next-line no-undef
      PhusionPassenger.configure({ autoInstall: false });
      app.listen('passenger');
    } else {
      app.listen(Number(process.env.PORT) || 4000);
    }
    return app;
  }
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
}

module.exports = { createApp, start };
