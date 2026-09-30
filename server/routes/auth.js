const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mediconsult-dev-secret-change-me';
const JWT_EXPIRES = '7d';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

router.post('/signup', async (req, res) => {
  try {
    const {
      full_name, email, password, date_of_birth, gender,
      phone, blood_group, allergies, chronic_conditions, emergency_contact
    } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'Full name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(emailNorm);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const result = await db.prepare(`
      INSERT INTO users (
        full_name, email, password_hash, date_of_birth, gender,
        phone, blood_group, allergies, chronic_conditions, emergency_contact
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      full_name.trim(),
      emailNorm,
      password_hash,
      date_of_birth || null,
      gender || null,
      phone || null,
      blood_group || null,
      allergies || '',
      chronic_conditions || '',
      emergency_contact || null
    );

    const user = await db.prepare(`
      SELECT id, full_name, email, date_of_birth, gender, phone, blood_group,
             allergies, chronic_conditions, emergency_contact, created_at
      FROM users WHERE id = ?
    `).get(result.lastInsertRowid);

    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const row = await db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(emailNorm);
    if (!row || !bcrypt.compareSync(password, row.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    await db.prepare('UPDATE users SET last_login = NOW() WHERE id = ?').run(row.id);
    const user = {
      id: row.id,
      full_name: row.full_name,
      email: row.email,
      date_of_birth: row.date_of_birth,
      gender: row.gender,
      phone: row.phone,
      blood_group: row.blood_group,
      allergies: row.allergies,
      chronic_conditions: row.chronic_conditions,
      emergency_contact: row.emergency_contact,
      created_at: row.created_at
    };
    res.json({ token: signToken(user), user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.prepare(`
      SELECT id, full_name, email, date_of_birth, gender, phone, blood_group,
             allergies, chronic_conditions, emergency_contact, created_at, last_login
      FROM users WHERE id = ?
    `).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const {
      full_name, phone, blood_group, allergies,
      chronic_conditions, emergency_contact, date_of_birth, gender
    } = req.body;
    await db.prepare(`
      UPDATE users SET
        full_name = COALESCE(?, full_name),
        phone = COALESCE(?, phone),
        blood_group = COALESCE(?, blood_group),
        allergies = COALESCE(?, allergies),
        chronic_conditions = COALESCE(?, chronic_conditions),
        emergency_contact = COALESCE(?, emergency_contact),
        date_of_birth = COALESCE(?, date_of_birth),
        gender = COALESCE(?, gender),
        updated_at = NOW()
      WHERE id = ?
    `).run(
      full_name ?? null,
      phone ?? null,
      blood_group ?? null,
      allergies ?? null,
      chronic_conditions ?? null,
      emergency_contact ?? null,
      date_of_birth || null,
      gender || null,
      req.user.id
    );
    const user = await db.prepare(`
      SELECT id, full_name, email, date_of_birth, gender, phone, blood_group,
             allergies, chronic_conditions, emergency_contact, created_at
      FROM users WHERE id = ?
    `).get(req.user.id);
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = { router, authMiddleware, JWT_SECRET };
