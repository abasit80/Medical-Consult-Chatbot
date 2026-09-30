const express = require('express');
const db = require('../db');
const { authMiddleware } = require('./auth');
const { buildConsultantReply, welcomeMessage, detectUrgency } = require('../medicalEngine');

const router = express.Router();
router.use(authMiddleware);

async function getProfile(userId) {
  return db.prepare(`
    SELECT id, full_name, allergies, chronic_conditions, blood_group, date_of_birth, gender
    FROM users WHERE id = ?
  `).get(userId);
}

router.get('/sessions', async (req, res) => {
  try {
    const sessions = await db.prepare(`
      SELECT id, title, consultation_type, urgency_level, status, summary, created_at, updated_at
      FROM chat_sessions
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).all(req.user.id);
    res.json({ sessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load sessions' });
  }
});

router.post('/sessions', async (req, res) => {
  try {
    const { consultation_type = 'primary', title } = req.body;
    const type = ['primary', 'urgent', 'report_review'].includes(consultation_type)
      ? consultation_type
      : 'primary';
    const sessionTitle = title || (
      type === 'urgent' ? 'Urgent consultation'
        : type === 'report_review' ? 'Report review'
          : 'Primary consultation'
    );

    const result = await db.prepare(`
      INSERT INTO chat_sessions (user_id, title, consultation_type, urgency_level)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, sessionTitle, type, type === 'urgent' ? 'urgent' : 'routine');

    const sessionId = result.lastInsertRowid;
    const welcome = welcomeMessage(type);
    await db.prepare(`
      INSERT INTO messages (session_id, role, content) VALUES (?, 'assistant', ?)
    `).run(sessionId, welcome);

    const session = await db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(sessionId);
    const messages = await db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY id').all(sessionId);
    res.status(201).json({ session, messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await db.prepare(`
      SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const messages = await db.prepare(`
      SELECT * FROM messages WHERE session_id = ? ORDER BY id
    `).all(session.id);
    res.json({ session, messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load session' });
  }
});

router.post('/sessions/:id/messages', async (req, res) => {
  try {
    const session = await db.prepare(`
      SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const content = (req.body.content || '').trim();
    if (!content) return res.status(400).json({ error: 'Message content is required' });

    await db.prepare(`
      INSERT INTO messages (session_id, role, content) VALUES (?, 'user', ?)
    `).run(session.id, content);

    const profile = await getProfile(req.user.id);
    const historyRows = await db.prepare(`
      SELECT role, content FROM messages WHERE session_id = ? ORDER BY id DESC LIMIT 12
    `).all(session.id);
    const history = historyRows.reverse();

    const { reply, urgency, symptoms, provider } = await buildConsultantReply(
      content,
      profile,
      history,
      session.consultation_type
    );

    await db.prepare(`
      INSERT INTO messages (session_id, role, content, metadata)
      VALUES (?, 'assistant', ?, ?)
    `).run(session.id, reply, JSON.stringify({ urgency, symptoms, provider }));

    await db.prepare(`
      UPDATE chat_sessions
      SET urgency_level = ?, updated_at = NOW(),
          title = CASE WHEN title LIKE 'Primary%' OR title LIKE 'Urgent%' OR title LIKE 'Report%' OR title = 'New Consultation'
            THEN ? ELSE title END
      WHERE id = ?
    `).run(
      urgency.level,
      content.slice(0, 48) + (content.length > 48 ? '…' : ''),
      session.id
    );

    await db.prepare(`
      INSERT INTO triage_assessments (
        user_id, session_id, chief_complaint, symptoms, severity_score,
        urgency_level, suggested_action, red_flags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      session.id,
      content.slice(0, 500),
      JSON.stringify(symptoms),
      urgency.score,
      urgency.level,
      urgency.action,
      JSON.stringify(urgency.redFlags || [])
    );

    const messages = await db.prepare(`
      SELECT * FROM messages WHERE session_id = ? ORDER BY id
    `).all(session.id);
    const updated = await db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(session.id);

    res.json({ session: updated, messages, urgency, provider });
  } catch (err) {
    console.error('Chat message error:', err);
    res.status(500).json({
      error: err.message?.includes('OPENAI_API_KEY')
        ? 'Assistant is not configured. Please contact support.'
        : (err.message || 'Failed to send message'),
      detail: 'Assistant reply failed'
    });
  }
});

router.delete('/sessions/:id', async (req, res) => {
  try {
    const session = await db.prepare(`
      SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    await db.prepare('DELETE FROM chat_sessions WHERE id = ?').run(session.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

router.post('/triage', (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text is required' });
  const urgency = detectUrgency(text);
  res.json({ urgency });
});

module.exports = router;
