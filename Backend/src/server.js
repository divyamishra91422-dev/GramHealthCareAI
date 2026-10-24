import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import db from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import reminderRoutes, { requireAuth } from './routes/reminderRoutes.js';
import healthTipsRoutes from './routes/healthTipsRoutes.js';
import hospitalRoutes from './routes/hospitalRoutes.js';
import symptomCheckerRoutes from './routes/symptomCheckerRoutes.js';
import languageRoutes from './routes/languageRoutes.js';
import chatbotRoutes from './routes/chatbotRoutes.js';

const app = express();

const allowedOrigins = new Set([
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
}));
app.use('/api/chatbot', express.json({ limit: '8mb' }));
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database connection failed:', error.message);
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/reminders', requireAuth, reminderRoutes);
app.use('/api/health-tips', healthTipsRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/symptom-checker', requireAuth, symptomCheckerRoutes);
app.use('/api/language', requireAuth, languageRoutes);
app.use('/api/chatbot', chatbotRoutes);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
