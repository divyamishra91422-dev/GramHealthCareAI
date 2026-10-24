import { Router } from 'express';
import db from '../config/db.js';

const router = Router();
const supportedLanguages = new Set(['en', 'hi', 'bn', 'ta', 'te', 'mr']);

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT language_code FROM user_preferences WHERE user_id = ?',
      [req.user.id]
    );
    return res.json({ language: rows[0]?.language_code || null });
  } catch (error) {
    console.error('Load language preference error:', error.message);
    return res.status(500).json({ message: 'Unable to load your language preference.' });
  }
});

router.put('/', async (req, res) => {
  const { language } = req.body || {};
  if (typeof language !== 'string' || !supportedLanguages.has(language)) {
    return res.status(400).json({ message: 'Choose one of the supported languages.' });
  }

  try {
    await db.execute(
      `INSERT INTO user_preferences (user_id, language_code)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE language_code = VALUES(language_code), updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, language]
    );
    return res.json({ message: 'Language preference saved to your account.', language });
  } catch (error) {
    console.error('Save language preference error:', error.message);
    return res.status(500).json({ message: 'Unable to save your language preference.' });
  }
});

export default router;
