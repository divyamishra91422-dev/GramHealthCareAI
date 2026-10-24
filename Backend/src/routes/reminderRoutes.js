import { Router } from 'express';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';

const router = Router();

export function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Authentication is not configured on the server.' });
  }
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Please log in to access your reminders.' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const id = Number(payload.sub);
    if (!Number.isSafeInteger(id) || id < 1) {
      return res.status(401).json({ message: 'Your login session is invalid. Please log in again.' });
    }
    req.user = { id };
    return next();
  } catch {
    return res.status(401).json({ message: 'Your login session has expired. Please log in again.' });
  }
}

function formatReminder(row) {
  return {
    id: row.id,
    name: row.medicine_name,
    dosage: row.dosage,
    time: String(row.reminder_time).slice(0, 5),
    notes: row.notes || '',
  };
}

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, medicine_name, dosage, reminder_time, notes FROM medicine_reminders WHERE user_id = ? ORDER BY reminder_time, id',
      [req.user.id]
    );
    return res.json({ reminders: rows.map(formatReminder) });
  } catch (error) {
    console.error('Load reminders error:', error.message);
    return res.status(500).json({ message: 'Unable to load reminders.' });
  }
});

router.post('/', async (req, res) => {
  const { name, dosage, time, notes = '' } = req.body || {};
  if (
    typeof name !== 'string' || !name.trim() || name.trim().length > 150 ||
    typeof dosage !== 'string' || !dosage.trim() || dosage.trim().length > 100 ||
    typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ||
    typeof notes !== 'string' || notes.trim().length > 300
  ) {
    return res.status(400).json({ message: 'Enter a medicine name, dosage, valid time, and a note under 300 characters.' });
  }
  try {
    const [result] = await db.execute(
      'INSERT INTO medicine_reminders (user_id, medicine_name, dosage, reminder_time, notes) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, name.trim(), dosage.trim(), time, notes.trim() || null]
    );
    return res.status(201).json({
      message: 'Reminder saved.',
      reminder: { id: result.insertId, name: name.trim(), dosage: dosage.trim(), time, notes: notes.trim() },
    });
  } catch (error) {
    console.error('Create reminder error:', error.message);
    return res.status(500).json({ message: 'Unable to save this reminder.' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ message: 'Invalid reminder ID.' });
  try {
    const [result] = await db.execute(
      'DELETE FROM medicine_reminders WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Reminder not found.' });
    return res.json({ message: 'Reminder deleted.' });
  } catch (error) {
    console.error('Delete reminder error:', error.message);
    return res.status(500).json({ message: 'Unable to delete this reminder.' });
  }
});

export default router;

