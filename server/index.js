const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });

const express = require('express');
const cors = require('cors');
const { getPatientContextSummary, getTodaysReminders } = require('./patientData');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const OPENROUTER_API_KEY = (process.env.OPENROUTER_API_KEY || '').trim();
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
const CURSOR_API_KEY = (process.env.CURSOR_API_KEY || '').trim();
const CURSOR_API_BASE = (process.env.CURSOR_API_BASE || 'https://api.cursor.com').trim();

/** Chat replies must stay under 350 characters. ~90 tokens is enough. */
const CHAT_MAX_TOKENS = 90;
const CHAT_MAX_CHARS = 350;

/**
 * Call an LLM for chat. Tries in order: OpenAI, OpenRouter, Groq, Cursor/compatible endpoint.
 * Returns the assistant reply text or null if no API is configured or the request fails.
 */
async function callChatAPI(messages) {
  const formatted = messages.map((m) => ({ role: m.role, content: m.content }));

  // 1) OpenAI API
  if (OPENAI_API_KEY) {
    const reply = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: formatted,
        max_tokens: CHAT_MAX_TOKENS,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const choice = data && data.choices && data.choices[0];
        return choice && choice.message && choice.message.content ? choice.message.content.trim() : null;
      })
      .catch(() => null);
    if (reply) return reply;
  }

  // 2) OpenRouter (free tier at openrouter.ai/keys)
  if (OPENROUTER_API_KEY) {
    const reply = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_CHAT_MODEL || 'openai/gpt-4o-mini',
        messages: formatted,
        max_tokens: CHAT_MAX_TOKENS,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const choice = data && data.choices && data.choices[0];
        return choice && choice.message && choice.message.content ? choice.message.content.trim() : null;
      })
      .catch(() => null);
    if (reply) return reply;
  }

  // 3) Groq (free tier at console.groq.com — fast, no credit card)
  if (GROQ_API_KEY) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_CHAT_MODEL || 'llama-3.3-70b-versatile',
        messages: formatted,
        max_completion_tokens: CHAT_MAX_TOKENS,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const choice = data && data.choices && data.choices[0];
      const reply = choice && choice.message && choice.message.content ? choice.message.content.trim() : null;
      if (reply) return reply;
    } else {
      const errBody = await res.text();
      console.warn('[Health Pal] Groq API error:', res.status, errBody.slice(0, 200));
    }
  }

  // 4) Cursor or other OpenAI-compatible endpoint (Basic auth) — Cursor's API has no chat endpoint
  if (CURSOR_API_KEY) {
    const url = `${CURSOR_API_BASE.replace(/\/$/, '')}/v1/chat/completions`;
    const auth = Buffer.from(`${CURSOR_API_KEY}:`).toString('base64');
    const reply = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        model: process.env.CURSOR_CHAT_MODEL || 'gpt-4o-mini',
        messages: formatted,
        max_tokens: CHAT_MAX_TOKENS,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const choice = data && data.choices && data.choices[0];
        return choice && choice.message && choice.message.content ? choice.message.content.trim() : null;
      })
      .catch(() => null);
    if (reply) return reply;
  }

  return null;
}

/**
 * Fallback when Cursor API is not available: conversational Health Pal that talks
 * about health problems and care plan. Only shows reminders when the user asks.
 */
function fallbackReply(messages, patientContext) {
  const lastUser = messages.filter((m) => m.role === 'user').pop();
  const text = (lastUser && lastUser.content) || '';
  const lower = text.toLowerCase().trim();

  const reminders = getTodaysReminders();
  const pending = reminders.filter((r) => !r.completed);
  const reminderLines = pending.length
    ? pending
        .slice(0, 5)
        .map((r) => `• ${r.title} at ${r.time}`)
        .join('\n')
    : '';

  // Only list reminders when user explicitly asks for them
  const askingForReminderList =
    lower.includes('remind') ||
    lower.includes('what do i take') ||
    lower.includes('today\'s med') ||
    lower.includes('today\'s pill') ||
    (lower.includes('medication') && (lower.includes('list') || lower.includes('what ') || lower.includes('when ')));
  if (askingForReminderList) {
    if (reminderLines) {
      return `Here are your upcoming reminders:\n\n${reminderLines}\n\nYou can mark them done in the app. Want to talk about how you're managing your conditions or your care plan?`;
    }
    return "You're all set with today's reminders. How are you feeling about your health lately? I'm here to chat about your conditions or care plan whenever you'd like.";
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Hi! I'm Health Pal, your health companion. I'm here to talk about your health—your conditions, your care plan, how you're doing—not just reminders. What's on your mind today?";
  }

  if (lower.includes('how are you') || lower.includes('how do you feel')) {
    return "I'm here to support you. How are you feeling today—physically and about your care? If you're managing diabetes, heart failure, or blood pressure, we can talk through any of that. What would help most right now?";
  }

  if (lower.includes('diabetes') || lower.includes('blood sugar')) {
    return "Managing diabetes is a big part of your care plan. Things like diet, activity, and taking Metformin as prescribed all help. How has your blood sugar been lately? Have you had any questions for your doctor about your diabetes care?";
  }

  if (lower.includes('heart') || lower.includes('chf') || lower.includes('failure')) {
    return "Heart failure care often focuses on medications like Lisinopril, Furosemide, and Carvedilol, plus watching for swelling or shortness of breath. How's your energy and breathing? Anything you've been meaning to bring up with your care team?";
  }

  if (lower.includes('blood pressure') || lower.includes('hypertension')) {
    return "Hypertension is something we can keep talking about. Taking your blood pressure medication (e.g. Lisinopril) consistently helps. How have your readings been? Want to talk about lifestyle or other parts of your care plan?";
  }

  if (lower.includes('care plan') || lower.includes('careplan')) {
    return "Your care plan includes your conditions—Type 2 Diabetes, Congestive Heart Failure, and Hypertension—and the medications and habits that support them. We can go through any part of it: how you're doing on meds, symptoms, or goals. What would you like to focus on?";
  }

  if (lower.includes('medication') || lower.includes('meds') || lower.includes('pill') || lower.includes('take ')) {
    if (!lower.includes('list') && !lower.includes('what ') && !lower.includes('when ') && !lower.includes('remind')) {
      return "We can definitely talk about your medications and how they fit into your care. You're on Metformin, Lisinopril, Furosemide, Carvedilol, and Aspirin for your conditions. Any side effects or questions about timing? Or say 'remind me' if you want today's reminder list.";
    }
  }

  // Symptoms and how you're feeling
  if (lower.includes('tired') || lower.includes('fatigue') || lower.includes('exhausted') || lower.includes('weak')) {
    return "Feeling tired can be related to several things—your conditions, medications, sleep, or activity. With heart failure and diabetes, it's worth tracking how often it happens and whether rest helps. Have you mentioned this to your care team? I'm here to listen; for a full workup, your doctor can help narrow it down.";
  }
  if (lower.includes('swelling') || lower.includes('swollen') || lower.includes('edema') || lower.includes('ankle')) {
    return "Swelling, especially in the legs or ankles, can be a sign to watch with heart failure. Keeping up with your Furosemide and limiting salt often helps. If it's new or getting worse, your care team should know. How long have you noticed it?";
  }
  if (lower.includes('shortness of breath') || lower.includes('breath') || lower.includes('breathing') || lower.includes('winded')) {
    return "Shortness of breath is something to keep an eye on with heart failure. Taking your medications as prescribed and watching fluid and salt can help. If it's new, worse, or happens at rest, tell your doctor or nurse. How have you been feeling otherwise?";
  }
  if (lower.includes('dizzy') || lower.includes('dizziness') || lower.includes('lightheaded')) {
    return "Dizziness can be related to blood pressure, blood sugar, or medications like some of yours. Try to note when it happens—after standing, after meals, or after your meds. Your care team can help figure out if we need to adjust anything. Are you keeping up with your blood pressure readings?";
  }
  if (lower.includes('side effect') || lower.includes('side effects') || lower.includes('nauseous') || lower.includes('upset stomach')) {
    return "Side effects are worth discussing. Metformin can sometimes bother the stomach; taking it with food can help. Lisinopril, Furosemide, and others can affect blood pressure or electrolytes. I'd suggest writing down what you're feeling and when, and sharing that with your doctor so they can adjust if needed. Anything in particular bothering you?";
  }
  if (lower.includes('food') && (lower.includes('metformin') || lower.includes('med') || lower.includes('take'))) {
    return "Taking Metformin with food can help reduce stomach upset. Your care team or pharmacist can give you the best timing for your dose. Do you have other questions about when to take your medications?";
  }
  if (lower.includes('when ') && (lower.includes('take') || lower.includes('med') || lower.includes('pill'))) {
    return "Timing of medications matters—some are best with food, some at the same time each day. Your prescription and care team have the exact schedule. If you want a quick list of what's coming up today, just ask for 'today's reminders.' Want to talk about how you're doing with taking them regularly?";
  }

  // General "how I feel" or open-ended health questions
  if (lower.includes('feel') || lower.includes('feeling') || lower.includes('symptom') || lower.includes('pain') || lower.includes('hurt')) {
    return "Thanks for sharing. I'm here to listen. It can help to keep a quick note of what you feel and when, so you can share it with your care team. Would you like to talk about your medications, your conditions, or something specific that's bothering you?";
  }
  if (lower.includes('doctor') || lower.includes('appointment') || lower.includes('care team')) {
    return "Your doctor and care team are the right people for diagnoses and treatment changes. I'm here to support you day to day—reminders, talking through your care plan, and how you're feeling. Is there something you want to prepare for your next visit or talk through now?";
  }
  if (lower.includes('why ') || lower.includes('what ') || lower.includes('can i ') || lower.includes('should i ') || lower.includes('?')) {
    return "I want to help with that. In this mode I can chat about your conditions (diabetes, heart failure, blood pressure), your medications, and your care plan. Can you tell me a bit more—for example, are you asking about how you're feeling, side effects, or when to take your meds? If you want today's reminder list, just ask.";
  }

  // Default: acknowledge and invite—vary the wording so it doesn't feel like a broken loop
  return "I'm not sure I caught that. I'm here to talk about your health and care plan—your conditions, how you're feeling, or your medications. What would you like to talk about? If you want today's reminder list, just ask.";
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
  const reply = await callChatAPI(messages);
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

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, patientContext } = req.body || {};
    const context = patientContext || getPatientContextSummary();
    const msgList = Array.isArray(messages) ? messages : [{ role: 'user', content: 'Hello' }];

    let reply = await callChatAPI(msgList);
    if (reply == null) {
      console.warn('[Health Pal] Using fallback replies — no working chat API. Set GROQ_API_KEY (free at console.groq.com), OPENAI_API_KEY, or OPENROUTER_API_KEY in .env and restart.');
      reply = fallbackReply(msgList, context);
    }
    if (reply && reply.length > CHAT_MAX_CHARS) reply = reply.slice(0, CHAT_MAX_CHARS - 1) + '…';

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
  const hasOpenAI = !!OPENAI_API_KEY;
  const hasOpenRouter = !!OPENROUTER_API_KEY;
  const hasGroq = !!GROQ_API_KEY;
  const hasCursor = !!CURSOR_API_KEY;
  const chatMode = hasOpenAI
    ? 'OpenAI'
    : hasOpenRouter
      ? 'OpenRouter'
      : hasGroq
        ? 'Groq'
        : hasCursor
          ? 'Cursor/custom API'
          : 'fallback (programmed replies)';
  console.log(`Health Pal API running on http://localhost:${PORT}`);
  console.log(`Chat: ${chatMode} (loaded .env from ${envPath})`);
  if (chatMode.includes('fallback') || chatMode.includes('Cursor')) {
    console.log('>>> For full AI chat: add GROQ_API_KEY (free at console.groq.com) to .env and restart.');
  }
});
