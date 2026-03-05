const express = require('express');
const cors = require('cors');
const { getPatientContextSummary, getTodaysReminders } = require('./patientData');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const CURSOR_API_KEY = process.env.CURSOR_API_KEY || '';
const CURSOR_API_BASE = process.env.CURSOR_API_BASE || 'https://api.cursor.com';

/**
 * Fallback when Cursor API is not available: generate Health Pal-style replies
 * and optionally include medication reminders.
 */
function fallbackReply(messages, patientContext) {
  const lastUser = messages.filter((m) => m.role === 'user').pop();
  const text = (lastUser && lastUser.content) || '';
  const lower = text.toLowerCase();

  const reminders = getTodaysReminders();
  const pending = reminders.filter((r) => !r.completed);
  const reminderLines = pending.length
    ? pending
        .slice(0, 5)
        .map((r) => `• ${r.title} at ${r.time}`)
        .join('\n')
    : '';

  if (lower.includes('remind') || lower.includes('medication') || lower.includes('take') || lower.includes('pill')) {
    if (reminderLines) {
      return `Here are your upcoming medication reminders:\n\n${reminderLines}\n\nMark them done in the app when you've taken each one. If you have questions about a medication, ask your doctor or pharmacist.`;
    }
    return "You're all set with today's medications. Keep taking them as prescribed and ask if you need a recap of your schedule.";
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Hi! I'm Health Pal, your virtual health companion. I can remind you about your medications and answer general questions about your conditions. What would you like to know?";
  }

  if (lower.includes('how are you') || lower.includes('how do you feel')) {
    return "I'm here to support you. How are you feeling today? Remember to take your medications as scheduled and reach out to your care team if anything feels off.";
  }

  if (lower.includes('diabetes') || lower.includes('blood sugar')) {
    return "Managing diabetes involves medication (like Metformin), diet, and monitoring. Take your medications with meals as prescribed, and keep your regular check-ups. I can remind you when it's time to take your meds—just ask.";
  }

  if (lower.includes('heart') || lower.includes('chf') || lower.includes('failure')) {
    return "For heart failure, taking your medications (e.g. Lisinopril, Furosemide, Carvedilol) on schedule is important. Watch for swelling or shortness of breath and tell your doctor if anything changes. Want a reminder list?";
  }

  if (lower.includes('blood pressure') || lower.includes('hypertension')) {
    return "For hypertension, taking your blood pressure medication (e.g. Lisinopril) at the same time each day helps. I can remind you—and don't forget to check your blood pressure as your doctor recommended.";
  }

  if (reminderLines) {
    return `Here are your current medication reminders:\n\n${reminderLines}\n\nAnything else you'd like to ask?`;
  }

  return "I'm here to help with medication reminders and general support. You can ask things like 'What medications do I take?' or 'Remind me to take my pills.' For specific medical advice, please contact your doctor.";
}

/** Points for ignoring a reminder (no response within 2 minutes). */
const IGNORED_REMINDER_POINTS = -5;

/** Points for asking a question in chat (any message). */
const CHAT_MESSAGE_POINTS = 3;
/** Points when the question is about diseases, care plan, or medications. */
const CHAT_TOPIC_POINTS = 5;

/** Detect if the last user message is about diseases, care plan, or medications. */
function isAboutDiseasesCareplanOrMeds(text) {
  const lower = (text || '').trim().toLowerCase();
  const keywords = [
    'disease', 'condition', 'diabetes', 'heart', 'blood pressure', 'hypertension', 'chf', 'failure',
    'care plan', 'careplan', 'medication', 'medications', 'meds', 'pill', 'pills', 'dose', 'prescription',
    'metformin', 'lisinopril', 'furosemide', 'carvedilol', 'aspirin', 'symptom', 'treatment',
    'remind', 'reminder', 'take my', 'when to take', 'side effect', 'interaction',
  ];
  return keywords.some((k) => lower.includes(k));
}

/** Classify user's text reply to a reminder as positive (adherence) or negative (non-adherence). Returns points delta. */
function fallbackClassifyReminderReply(reminderType, reminderText, userReply) {
  const text = (userReply || '').trim().toLowerCase();
  if (!text) return { positive: false, points: IGNORED_REMINDER_POINTS };

  const positiveWords = ['yes', 'yeah', 'yep', 'took', 'taken', 'did', 'done', 'good', 'ok', 'okay', 'sure', 'had', 'drank', 'walked', 'better', 'fine', 'great'];
  const negativeWords = ['no', 'nope', 'not', "didn't", 'dont', "don't", 'skip', 'later', 'ignore', 'won\'t', 'wont', 'bad', 'terrible', 'refuse'];
  let positiveCount = 0;
  let negativeCount = 0;
  for (const w of positiveWords) {
    if (text.includes(w)) positiveCount++;
  }
  for (const w of negativeWords) {
    if (text.includes(w)) negativeCount++;
  }
  if (negativeCount > positiveCount) return { positive: false, points: -5 };
  if (positiveCount > negativeCount) return { positive: true, points: 5 };
  return { positive: false, points: -2 }; // ambiguous -> treat as slight negative
}

/**
 * Classify reminder response using LLM or fallback. Returns { positive, points }.
 */
async function classifyReminderResponse(reminderType, reminderText, userReply) {
  const systemPrompt = `You are a health care assistant. Given a reminder that was shown to the patient and their text reply, classify whether the reply indicates ADHERENCE (positive) or NON-ADHERENCE / IGNORING (negative).

Reminder type: ${reminderType}
Reminder text: "${reminderText}"
Patient reply: "${(userReply || '').trim()}"

Respond with ONLY a JSON object, no other text: { "positive": true or false, "points": number }
- positive true = they did the thing or they not yet, butcommitted to it. Use points between 2 and 5. Feeling bad but staying adherent and replying is positive.
- positive false = they did not, refused, or are ignoring. Use points between -5 and -1.
Example: {"positive":true,"points":5}
Example: {"positive":false,"points":-5}`;

  const messages = [{ role: 'system', content: systemPrompt }, { role: 'user', content: 'Classify this reply.' }];
  const reply = await callCursorChat(messages);
  if (reply) {
    try {
      const parsed = JSON.parse(reply.replace(/[\s\S]*?(\{[\s\S]*\})[\s\S]*/, '$1'));
      const positive = !!parsed.positive;
      let points = typeof parsed.points === 'number' ? parsed.points : positive ? 5 : -5;
      points = Math.max(-5, Math.min(5, points));
      return { positive, points };
    } catch (_) {}
  }
  return fallbackClassifyReminderReply(reminderType, reminderText, userReply);
}

/**
 * Call Cursor-compatible chat completions API (if base URL supports it).
 */
async function callCursorChat(messages) {
  if (!CURSOR_API_KEY) return null;
  const url = `${CURSOR_API_BASE.replace(/\/$/, '')}/v1/chat/completions`;
  const auth = Buffer.from(`${CURSOR_API_KEY}:`).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: 512,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const choice = data.choices && data.choices[0];
  return choice && choice.message && choice.message.content ? choice.message.content.trim() : null;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, patientContext } = req.body || {};
    const context = patientContext || getPatientContextSummary();
    const msgList = Array.isArray(messages) ? messages : [{ role: 'user', content: 'Hello' }];

    let reply = await callCursorChat(msgList);
    if (reply == null) {
      reply = fallbackReply(msgList, context);
    }

    const lastUser = msgList.filter((m) => m.role === 'user').pop();
    const lastContent = (lastUser && lastUser.content) || '';
    const messagePoints = isAboutDiseasesCareplanOrMeds(lastContent) ? CHAT_TOPIC_POINTS : CHAT_MESSAGE_POINTS;

    res.json({ reply, messagePoints });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

app.get('/api/reminders', (req, res) => {
  try {
    const reminders = getTodaysReminders();
    res.json({ reminders });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
});

// In-memory care points (per server instance). Optionally persist to DB later.
let carePoints = 0;

app.get('/api/care-points', (req, res) => {
  res.json({ points: carePoints });
});

app.patch('/api/care-points', (req, res) => {
  const delta = Number(req.body && req.body.delta) || 0;
  carePoints = Math.max(0, carePoints + delta);
  res.json({ points: carePoints });
});

/** POST /api/classify-reminder-response: AI classifies text reply as positive/negative, returns points delta. */
app.post('/api/classify-reminder-response', async (req, res) => {
  try {
    const { reminderType, reminderText, userReply } = req.body || {};
    const result = await classifyReminderResponse(
      reminderType || 'general',
      reminderText || '',
      userReply != null ? String(userReply) : ''
    );
    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error', positive: false, points: -5 });
  }
});

app.listen(PORT, () => {
  console.log(`Health Pal API running on http://localhost:${PORT}`);
});
