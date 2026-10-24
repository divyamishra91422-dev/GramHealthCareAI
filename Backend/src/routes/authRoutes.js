import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import rateLimit from 'express-rate-limit';
import db from '../config/db.js';

const router = Router();
const googleClient = new OAuth2Client();
const googleLoginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });

function makeToken(user) {
  return jwt.sign(
    { sub: String(user.id), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

router.post('/register', async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Authentication is not configured on the server.' });
    }

    const { name, email, password } = req.body;
    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: 'Enter your name and email, and a password of at least 8 characters.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'That email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), normalizedEmail, passwordHash]
    );

    const user = { id: result.insertId, name: name.trim(), email: normalizedEmail };
    return res.status(201).json({
      message: 'Account created.',
      token: makeToken(user),
      user,
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'That email is already registered.' });
    }
    console.error('Register error:', error.message);
    return res.status(500).json({ message: 'Unable to create the account.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Authentication is not configured on the server.' });
    }

    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Enter your email and password.' });
    }

    const [users] = await db.execute(
      'SELECT id, name, email, password_hash FROM users WHERE email = ?',
      [email.trim().toLowerCase()]
    );
    const user = users[0];

    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }

    return res.json({
      message: 'Login successful.',
      token: makeToken(user),
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({ message: 'Unable to log in.' });
  }
});

router.post('/google', googleLoginLimiter, async (req, res) => {
  if (!process.env.JWT_SECRET || !process.env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({ message: 'Google sign-in is not configured on the server.' });
  }

  const credential = req.body?.credential;
  if (typeof credential !== 'string' || credential.length > 10000) {
    return res.status(400).json({ message: 'A valid Google credential is required.' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({ message: 'Google could not verify this account.' });
    }

    const email = payload.email.toLowerCase();
    const [matches] = await db.execute(
      'SELECT id, name, email, google_sub FROM users WHERE google_sub = ? OR email = ? LIMIT 1',
      [payload.sub, email]
    );
    let user = matches[0];

    if (user && user.google_sub && user.google_sub !== payload.sub) {
      return res.status(409).json({ message: 'This email is already linked to another Google account.' });
    }
    if (user) {
      if (!user.google_sub) {
        await db.execute('UPDATE users SET google_sub = ? WHERE id = ?', [payload.sub, user.id]);
      }
    } else {
      const name = (payload.name || email.split('@')[0]).slice(0, 100);
      const [result] = await db.execute(
        'INSERT INTO users (name, email, password_hash, google_sub) VALUES (?, ?, NULL, ?)',
        [name, email, payload.sub]
      );
      user = { id: result.insertId, name, email, google_sub: payload.sub };
    }

    return res.json({
      message: 'Google sign-in successful.',
      token: makeToken(user),
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Google sign-in error:', error.message);
    return res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
  }
});

export default router;
