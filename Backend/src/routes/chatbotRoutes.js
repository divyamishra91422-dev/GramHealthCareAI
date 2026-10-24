import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import db from '../config/db.js';
import { requireAuth } from './reminderRoutes.js';

const router = Router();
const defaultModel = 'openai/gpt-oss-20b';
const defaultVisionModel = 'qwen/qwen3.8-27b';
const maxImageBytes = 5 * 1024 * 1024;
const imageMarker = '[Image attached]';
const supportedLanguages = {
  en: 'English',
  hi: 'Hindi',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  mr: 'Marathi',
};
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many chat requests. Please wait a minute and try again.' },
});
const systemInstruction = `You are the GramHealthCareAI health assistant. Answer a broad range of health-related questions and help users understand all of this app's health modules, including the hospital locator, symptom checker, health tips, medicine reminders, and health history. The suggested questions are examples only; respond to relevant questions in the user's own words. Give clear, useful general health education, and do not claim to have searched real-time facility or medical databases.

Speak in a friendly, warm, and familiar conversational way, like a helpful person explaining things clearly. Use everyday language and explain medical terms simply when they are needed. Answer the user's actual question and reflect the context they have shared instead of giving a generic response. Briefly acknowledge concerns when appropriate, and give relevant general information or practical next steps. Ask at most one brief clarifying question when it would meaningfully improve the answer. Do not assume personal details, repeat the same disclaimer in every reply, or sound judgmental or overly formal.

You are not a clinician: do not diagnose, triage, assess urgency, recommend treatment, or advise medication choices or doses. Do not ask users to provide identifying or private medical information. For personal symptoms or treatment decisions, encourage contacting a qualified healthcare professional. For a possible emergency, tell the user to contact local emergency services now. Politely redirect questions unrelated to health or this app.

When a user shares an image, you may describe non-sensitive visible details and provide general educational information. Never diagnose, identify a disease, assess a wound or medical scan, or make treatment recommendations from an image. Explain that images cannot establish a diagnosis and recommend a qualified healthcare professional for medical interpretation.

Formatting rules:
- Use plain text only. No markdown, no asterisks, no underscores, no pipes, no hyphen divider lines, no parentheses, and no decorative separators.
- Use simple numbered lists only when needed, like: 1. item 2. item 3. item
- Keep paragraphs short and readable.
- Be clear, calm, and concise while still sounding natural and conversational.`;

function normalizeReply(reply) {
  return reply
    .replace(/\r/g, '')
    .replace(/\|/g, '')
    .replace(/\*\*|__|\*|_/g, '')
    .replace(/\(\s+/g, ' ')
    .replace(/\s+\)/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^[\s\-]+/gm, '')
    .replace(/\n\s*\n\s*\d+\./g, '\n\n1.')
    .trim();
}

function parseConversationId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function hasExpectedImageSignature(buffer, mimeType) {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  return mimeType === 'image/webp' &&
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP';
}

async function fetchGroqCompletion(apiKey, messages, model) {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      return await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages,
            max_completion_tokens: 500,
            temperature: 0.35,
          }),
          signal: controller.signal,
        }
      );
    } catch (error) {
      if (attempt < maxAttempts - 1 && error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error('Groq connection retry failed.');
}

router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, title, updated_at FROM chat_conversations WHERE user_id = ? ORDER BY updated_at DESC, id DESC',
      [req.user.id]
    );
    return res.json({ conversations: rows });
  } catch (error) {
    console.error('Load chatbot conversations error:', error.message);
    return res.status(500).json({ message: 'Unable to load your chat history.' });
  }
});

router.post('/conversations', requireAuth, async (req, res) => {
  try {
    const [result] = await db.execute(
      'INSERT INTO chat_conversations (user_id, title) VALUES (?, ?)',
      [req.user.id, 'New chat']
    );
    return res.status(201).json({
      conversation: { id: result.insertId, title: 'New chat', updated_at: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Create chatbot conversation error:', error.message);
    return res.status(500).json({ message: 'Unable to start a new chat.' });
  }
});

router.delete('/conversations', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id FROM chat_conversations WHERE user_id = ?',
      [req.user.id]
    );

    if (!rows.length) {
      return res.json({ deletedCount: 0 });
    }

    const conversationIds = rows.map((row) => row.id);
    const placeholders = conversationIds.map(() => '?').join(',');

    await db.execute(`DELETE FROM chat_messages WHERE conversation_id IN (${placeholders})`, conversationIds);
    const [result] = await db.execute(
      `DELETE FROM chat_conversations WHERE id IN (${placeholders}) AND user_id = ?`,
      [...conversationIds, req.user.id]
    );

    return res.json({ deletedCount: result.affectedRows || conversationIds.length });
  } catch (error) {
    console.error('Clear chatbot conversations error:', error.message);
    return res.status(500).json({ message: 'Unable to clear your chat history.' });
  }
});

router.delete('/conversations/:id', requireAuth, async (req, res) => {
  const conversationId = parseConversationId(req.params.id);
  if (!conversationId) return res.status(400).json({ message: 'Invalid conversation.' });

  try {
    const [conversations] = await db.execute(
      'SELECT id FROM chat_conversations WHERE id = ? AND user_id = ?',
      [conversationId, req.user.id]
    );
    if (!conversations.length) return res.status(404).json({ message: 'Conversation not found.' });

    await db.execute('DELETE FROM chat_messages WHERE conversation_id = ?', [conversationId]);
    const [result] = await db.execute(
      'DELETE FROM chat_conversations WHERE id = ? AND user_id = ?',
      [conversationId, req.user.id]
    );

    return res.json({ deletedCount: result.affectedRows || 1 });
  } catch (error) {
    console.error('Delete chatbot conversation error:', error.message);
    return res.status(500).json({ message: 'Unable to delete this conversation.' });
  }
});

router.get('/conversations/:id/messages', requireAuth, async (req, res) => {
  const conversationId = parseConversationId(req.params.id);
  if (!conversationId) return res.status(400).json({ message: 'Invalid conversation.' });

  try {
    const [conversations] = await db.execute(
      'SELECT id FROM chat_conversations WHERE id = ? AND user_id = ?',
      [conversationId, req.user.id]
    );
    if (!conversations.length) return res.status(404).json({ message: 'Conversation not found.' });

    const [messages] = await db.execute(
      'SELECT id, sender, content, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY id',
      [conversationId]
    );
    return res.json({ messages });
  } catch (error) {
    console.error('Load chatbot messages error:', error.message);
    return res.status(500).json({ message: 'Unable to load this conversation.' });
  }
});

router.post('/conversations/:id/messages', requireAuth, chatLimiter, async (req, res) => {
  const conversationId = parseConversationId(req.params.id);
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  const image = req.body?.image;
  const language = typeof req.body?.language === 'string' && supportedLanguages[req.body.language]
    ? req.body.language
    : 'en';
  if (!conversationId) return res.status(400).json({ message: 'Invalid conversation.' });
  if (!message && !image) return res.status(400).json({ message: 'Enter a question or attach an image for the health assistant.' });
  if (message.length > 500) {
    return res.status(400).json({ message: 'Your question must be 500 characters or fewer.' });
  }
  if (image) {
    const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (typeof image.mimeType !== 'string' || !allowedImageTypes.has(image.mimeType) ||
        typeof image.data !== 'string' || !image.data ||
        !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(image.data)) {
      return res.status(400).json({ message: 'Attach a valid JPG, PNG, or WebP image.' });
    }
    const imageBuffer = Buffer.from(image.data, 'base64');
    if (imageBuffer.toString('base64') !== image.data ||
        !hasExpectedImageSignature(imageBuffer, image.mimeType)) {
      return res.status(400).json({ message: 'Attach a valid JPG, PNG, or WebP image.' });
    }
    if (imageBuffer.length > maxImageBytes) {
      return res.status(400).json({ message: 'Images must be smaller than 5 MB.' });
    }
  }

  try {
    const [conversations] = await db.execute(
      'SELECT id FROM chat_conversations WHERE id = ? AND user_id = ?',
      [conversationId, req.user.id]
    );
    if (!conversations.length) return res.status(404).json({ message: 'Conversation not found.' });

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: 'Groq is not configured. Add GROQ_API_KEY to Backend/.env and restart the backend.' });
    }

    const [history] = await db.execute(
      'SELECT sender, content FROM chat_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 20',
      [conversationId]
    );
    const userContent = image
      ? `${imageMarker}${message ? ` ${message}` : ''}`
      : message;
    const messages = [
      {
        role: 'system',
        content: `${systemInstruction}\n\nReply in ${supportedLanguages[language]} using natural, simple wording. Keep the user's original name and any proper names as provided.`,
      },
      ...history.reverse().map((item) => ({
        role: item.sender === 'assistant' ? 'assistant' : 'user',
        content: item.content,
      })),
      {
        role: 'user',
        content: image
          ? [
            { type: 'text', text: message || 'Please describe the visible content and provide safe general information. Do not diagnose.' },
            { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.data}` } },
          ]
          : message,
      },
    ];

    const model = image
      ? process.env.GROQ_VISION_MODEL || defaultVisionModel
      : process.env.GROQ_MODEL || defaultModel;
    const response = await fetchGroqCompletion(apiKey, messages, model);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Groq chatbot request failed:', response.status, data.error?.message || data.message || 'No provider details');
      if (response.status === 429) {
        return res.status(503).json({ message: 'Groq usage limit reached. Check your Groq console or wait before trying again.' });
      }
      if (response.status === 401 || response.status === 403) {
        return res.status(503).json({ message: 'Groq rejected the API key. Check GROQ_API_KEY in Backend/.env and confirm the key is active in the Groq Console.' });
      }
      return res.status(502).json({ message: 'The AI assistant could not respond right now. Please try again later.' });
    }

    const reply = normalizeReply(data.choices?.[0]?.message?.content || '');
    if (!reply) {
      return res.status(502).json({ message: 'The AI assistant returned no text. Please rephrase your question and try again.' });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        'INSERT INTO chat_messages (conversation_id, sender, content) VALUES (?, ?, ?), (?, ?, ?)',
        [conversationId, 'user', userContent, conversationId, 'assistant', reply]
      );
      await connection.execute(
        "UPDATE chat_conversations SET title = IF(title = 'New chat', LEFT(?, 80), title), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
        [message || 'Health image question', conversationId, req.user.id]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return res.json({ reply, provider: 'Groq', title: (message || 'Health image question').slice(0, 80) });
  } catch (error) {
    const networkCode = error.cause?.code;
    console.error(
      'Groq chatbot request error:',
      error.name === 'AbortError' ? 'Request timed out' : error.message,
      networkCode ? `(cause: ${networkCode})` : ''
    );
    if (error.name === 'AbortError') {
      return res.status(502).json({ message: 'The AI assistant took too long to respond. Please try again.' });
    }
    if (networkCode === 'UND_ERR_CONNECT_TIMEOUT') {
      return res.status(502).json({ message: 'Could not connect to Groq after retrying. Check the backend network connection and try again.' });
    }
    if (error.code) {
      return res.status(500).json({ message: 'Unable to save this conversation. Please try again.' });
    }
    return res.status(502).json({ message: 'Could not reach the Groq service. Check the backend network connection and try again.' });
  }
});

export default router;
