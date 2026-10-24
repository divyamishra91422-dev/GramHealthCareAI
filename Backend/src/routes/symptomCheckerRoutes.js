import { Router } from 'express';
import db from '../config/db.js';

const router = Router();

const allowedSymptoms = new Set([
  'Fever',
  'Headache',
  'Cough',
  'Sore throat',
  'Fatigue',
  'Nausea',
  'Body aches',
  'Stomach pain',
  'Trouble breathing',
  'Chest pain or pressure',
  'Fainting',
  'New confusion',
]);

const allowedDurations = new Set(['today', 'few-days', 'week', 'longer']);

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, symptoms, duration, created_at FROM symptom_checks WHERE user_id = ? ORDER BY created_at DESC, id DESC',
      [req.user.id]
    );
    return res.json({
      checks: rows.map((row) => {
        let symptoms = row.symptoms;
        try {
          if (typeof symptoms === 'string') symptoms = JSON.parse(symptoms);
        } catch {
          symptoms = [];
        }
        return {
          id: row.id,
          symptoms: Array.isArray(symptoms) ? symptoms : [],
          duration: row.duration,
          createdAt: row.created_at,
        };
      }),
    });
  } catch (error) {
    console.error('Load symptom history error:', error.message);
    return res.status(500).json({ message: 'Unable to load symptom history. Confirm that symptom_checks has id, user_id, symptoms, duration, and created_at columns.' });
  }
});

router.post('/', async (req, res) => {
  const { symptoms, duration, consent } = req.body || {};
  if (
    !Array.isArray(symptoms) ||
    symptoms.length < 1 ||
    symptoms.length > allowedSymptoms.size ||
    symptoms.some((symptom) => typeof symptom !== 'string' || !allowedSymptoms.has(symptom)) ||
    !allowedDurations.has(duration) ||
    consent !== true
  ) {
    return res.status(400).json({ message: 'Select at least one listed symptom, choose a duration, and confirm that you want to save this check.' });
  }

  try {
    const [insertResult] = await db.execute(
      'INSERT INTO symptom_checks (user_id, symptoms, duration) VALUES (?, ?, ?)',
      [req.user.id, JSON.stringify(symptoms), duration]
    );
    return res.status(201).json({
      id: insertResult.insertId,
      stored: true,
      message: 'Your symptom check was saved to your account. This tool does not diagnose or recommend treatment, and its warning-sign list cannot rule out an emergency. Contact a qualified healthcare professional for medical advice. If symptoms are severe or you think this is an emergency, contact local emergency services now.',
    });
  } catch (error) {
    console.error('Save symptom check error:', error.message);
    return res.status(500).json({ message: 'Unable to save this symptom check. Please confirm that the symptom_checks table exists.' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ message: 'Invalid symptom record ID.' });
  }

  try {
    const [result] = await db.execute(
      'DELETE FROM symptom_checks WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Symptom record not found.' });
    }
    return res.json({ message: 'Symptom record deleted from your account.' });
  } catch (error) {
    console.error('Delete symptom record error:', error.message);
    return res.status(500).json({ message: 'Unable to delete this symptom record.' });
  }
});

export default router;
