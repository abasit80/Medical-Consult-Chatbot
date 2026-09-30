const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db');
const { authMiddleware } = require('./auth');
const { reviewReportText, welcomeMessage } = require('../medicalEngine');

const router = express.Router();
router.use(authMiddleware);

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(txt|csv|md|json|log)$/i.test(file.originalname) ||
      file.mimetype.startsWith('text/') ||
      file.mimetype === 'application/json';
    if (ok) cb(null, true);
    else cb(new Error('Please upload a text-based report (.txt, .csv, .md, .json)'));
  }
});

router.get('/', async (req, res) => {
  try {
    const reports = (await db.prepare(`
      SELECT id, original_name, file_type, file_size, report_type, ai_summary,
             findings, recommendations, risk_flags, review_status, uploaded_at, reviewed_at, session_id
      FROM medical_reports
      WHERE user_id = ?
      ORDER BY uploaded_at DESC
    `).all(req.user.id)).map((r) => ({
      ...r,
      findings: safeParse(r.findings, []),
      recommendations: safeParse(r.recommendations, []),
      risk_flags: safeParse(r.risk_flags, [])
    }));
    res.json({ reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load reports' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const report = await db.prepare(`
      SELECT * FROM medical_reports WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({
      report: {
        ...report,
        findings: safeParse(report.findings, []),
        recommendations: safeParse(report.recommendations, []),
        risk_flags: safeParse(report.risk_flags, [])
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load report' });
  }
});

router.post('/review-text', async (req, res) => {
  try {
    const { text, report_type = 'blood_work', create_session = true } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: 'Report text is required' });
    }

    const review = await reviewReportText(String(text), report_type);
    let sessionId = null;

    if (create_session) {
      const s = await db.prepare(`
        INSERT INTO chat_sessions (user_id, title, consultation_type, urgency_level)
        VALUES (?, ?, 'report_review', ?)
      `).run(req.user.id, 'Report review', review.urgency.level);
      sessionId = s.lastInsertRowid;
      await db.prepare(`
        INSERT INTO messages (session_id, role, content) VALUES (?, 'assistant', ?)
      `).run(sessionId, welcomeMessage('report_review'));
      await db.prepare(`
        INSERT INTO messages (session_id, role, content) VALUES (?, 'user', ?)
      `).run(sessionId, `Please review this report:\n\n${String(text).slice(0, 4000)}`);
      await db.prepare(`
        INSERT INTO messages (session_id, role, content, metadata) VALUES (?, 'assistant', ?, ?)
      `).run(sessionId, review.aiSummary, JSON.stringify({ urgency: review.urgency, riskFlags: review.riskFlags }));
    }

    const result = await db.prepare(`
      INSERT INTO medical_reports (
        user_id, session_id, file_name, original_name, file_type, file_size,
        report_type, extracted_text, ai_summary, findings, recommendations,
        risk_flags, review_status, reviewed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reviewed', NOW())
    `).run(
      req.user.id,
      sessionId,
      'pasted-text.txt',
      'Pasted report',
      'text/plain',
      Buffer.byteLength(String(text), 'utf8'),
      report_type,
      String(text),
      review.aiSummary,
      JSON.stringify(review.findings),
      JSON.stringify(review.recommendations),
      JSON.stringify(review.riskFlags)
    );

    res.status(201).json({
      reportId: result.lastInsertRowid,
      sessionId,
      review
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Report review failed' });
  }
});

router.post('/upload', (req, res) => {
  upload.single('report')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed' });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
      const text = fs.readFileSync(req.file.path, 'utf8');
      const report_type = req.body.report_type || 'general';
      const review = await reviewReportText(text, report_type);

      const s = await db.prepare(`
        INSERT INTO chat_sessions (user_id, title, consultation_type, urgency_level)
        VALUES (?, ?, 'report_review', ?)
      `).run(req.user.id, `Review: ${req.file.originalname}`, review.urgency.level);
      const sessionId = s.lastInsertRowid;

      await db.prepare(`
        INSERT INTO messages (session_id, role, content) VALUES (?, 'assistant', ?)
      `).run(sessionId, welcomeMessage('report_review'));
      await db.prepare(`
        INSERT INTO messages (session_id, role, content) VALUES (?, 'user', ?)
      `).run(sessionId, `Uploaded report: ${req.file.originalname}`);
      await db.prepare(`
        INSERT INTO messages (session_id, role, content, metadata) VALUES (?, 'assistant', ?, ?)
      `).run(sessionId, review.aiSummary, JSON.stringify({ urgency: review.urgency }));

      const result = await db.prepare(`
        INSERT INTO medical_reports (
          user_id, session_id, file_name, original_name, file_type, file_size,
          report_type, extracted_text, ai_summary, findings, recommendations,
          risk_flags, review_status, reviewed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'reviewed', NOW())
      `).run(
        req.user.id,
        sessionId,
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        report_type,
        text,
        review.aiSummary,
        JSON.stringify(review.findings),
        JSON.stringify(review.recommendations),
        JSON.stringify(review.riskFlags)
      );

      res.status(201).json({
        reportId: result.lastInsertRowid,
        sessionId,
        review
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to process uploaded report' });
    }
  });
});

function safeParse(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

module.exports = router;
