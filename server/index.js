const path = require('path');
const envPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });

const express = require('express');
const cors = require('cors');
const { getPatientContextSummary, getTodaysReminders, PATIENT_PROFILE } = require('./patientData');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const OPENROUTER_API_KEY = (process.env.OPENROUTER_API_KEY || '').trim();
const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
const CURSOR_API_KEY = (process.env.CURSOR_API_KEY || '').trim();
const CURSOR_API_BASE = (process.env.CURSOR_API_BASE || 'https://api.cursor.com').trim();
const ELEVENLABS_API_KEY = (process.env.ELEVENLABS_API_KEY || '').trim();
const ELEVENLABS_VOICE_ID = (process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM').trim(); // Rachel

/** Chat replies must stay under 350 characters. ~90 tokens is enough. */
const CHAT_MAX_TOKENS = 90;
const CHAT_MAX_CHARS = 350;

/**
 * Call an LLM for chat. Tries in order: OpenAI, OpenRouter, Groq, Cursor/compatible endpoint.
 * Returns the assistant reply text or null if no API is configured or the request fails.
 * Optional maxTokens overrides default CHAT_MAX_TOKENS.
 */
async function callChatAPI(messages, maxTokens = CHAT_MAX_TOKENS) {
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
        max_tokens: maxTokens,
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
        max_tokens: maxTokens,
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
        max_completion_tokens: maxTokens,
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
        max_tokens: maxTokens,
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
      return `Here’s what’s coming up for today:\n\n${reminderLines}\n\nI set mine on my phone too—helps me stay on track. How are you feeling with your condition lately?`;
    }
    return "You're all set for today. I know some days are harder than others—how are you doing with everything?";
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return "Hey! I’ve been through the same kind of stuff with my health, so I get it. What’s on your mind today?";
  }

  if (lower.includes('how are you') || lower.includes('how do you feel')) {
    return "I’m okay—some days are better than others, same as anyone with our condition. How are you really doing? I’m here to listen.";
  }

  if (lower.includes('diabetes') || lower.includes('blood sugar')) {
    return "When I was first dealing with it, my doctor told me diet and staying active make a big difference. How’s your blood sugar been? It’s tough sometimes, I know.";
  }

  if (lower.includes('heart') || lower.includes('chf') || lower.includes('failure')) {
    return "I’ve had to learn to watch my fluid and take my meds every day—it’s not easy. How’s your energy and breathing? If something feels off, your care team should know.";
  }

  if (lower.includes('blood pressure') || lower.includes('hypertension')) {
    return "My doctor told me consistency with the medication really helps. How have your readings been? I know it can feel like a lot to track.";
  }

  if (lower.includes('care plan') || lower.includes('careplan')) {
    return "We’re in a similar boat—conditions, meds, all of it. What part do you want to talk about? How you’re feeling, or something specific?";
  }

  if (lower.includes('medication') || lower.includes('meds') || lower.includes('pill') || lower.includes('take ')) {
    if (!lower.includes('list') && !lower.includes('what ') && !lower.includes('when ') && !lower.includes('remind')) {
      return "I take similar stuff—it can be a lot. Any side effects or questions about when you take yours? Or say 'remind me' if you want today’s list.";
    }
  }

  // Symptoms and how you're feeling
  if (lower.includes('tired') || lower.includes('fatigue') || lower.includes('exhausted') || lower.includes('weak')) {
    return "I get that. When I feel like that I try to note when it happens—sometimes it’s my meds or just a rough patch. Worth mentioning to your doctor so they can help figure it out. You’re not alone in this.";
  }
  if (lower.includes('swelling') || lower.includes('swollen') || lower.includes('edema') || lower.includes('ankle')) {
    return "I’ve had that too—my doctor said to watch salt and keep up with my water pill. If it’s new or worse, definitely tell your care team. How long have you noticed it?";
  }
  if (lower.includes('shortness of breath') || lower.includes('breath') || lower.includes('breathing') || lower.includes('winded')) {
    return "I know how scary that can feel. Taking my meds and watching fluid has helped me. If it’s new or you’re getting winded at rest, please tell your doctor. How have you been otherwise?";
  }
  if (lower.includes('dizzy') || lower.includes('dizziness') || lower.includes('lightheaded')) {
    return "I’ve had that—sometimes blood pressure or blood sugar. My doctor said to note when it happens. Are you checking your readings? Worth bringing up at your next visit.";
  }
  if (lower.includes('side effect') || lower.includes('side effects') || lower.includes('nauseous') || lower.includes('upset stomach')) {
    return "I had stomach issues with one of my meds too—taking it with food helped. Definitely tell your doctor what you’re feeling and when; they can adjust. What’s bothering you most?";
  }
  if (lower.includes('food') && (lower.includes('metformin') || lower.includes('med') || lower.includes('take'))) {
    return "With that one I take it with food—made a difference for me. Your pharmacist or doctor can say what’s best for your dose. Anything else about when you take your meds?";
  }
  if (lower.includes('when ') && (lower.includes('take') || lower.includes('med') || lower.includes('pill'))) {
    return "I try to take mine at the same time every day—my doctor said it helps. For your exact schedule, your care team knows best. Want today’s reminder list? Just ask.";
  }

  // General "how I feel" or open-ended health questions
  if (lower.includes('feel') || lower.includes('feeling') || lower.includes('symptom') || lower.includes('pain') || lower.includes('hurt')) {
    return "I’m sorry you’re going through that. Writing down what you feel and when really helped me explain it to my doctor. Want to talk about your meds or something specific?";
  }
  if (lower.includes('doctor') || lower.includes('appointment') || lower.includes('care team')) {
    return "Your doctor’s the one to make changes—I just share what I’ve been through. Is there something you want to prepare for your next visit? I’m here to listen.";
  }
  if (lower.includes('why ') || lower.includes('what ') || lower.includes('can i ') || lower.includes('should i ') || lower.includes('?')) {
    return "I get it—I had a lot of questions too. Tell me a bit more? Like how you’re feeling, side effects, or when to take things? I’ll share what helped me.";
  }

  // Default: acknowledge and invite—vary the wording so it doesn't feel like a broken loop
  return "I’m not sure I got that. I’m here as someone who gets it—we can talk about how you’re feeling, your meds, or your condition. What do you want to talk about?";
}

/** Points for ignoring a reminder (no response within 2 minutes). */
const IGNORED_REMINDER_POINTS = -5;

/** Reminder types for round-robin (from patient profile schedules). Includes medication. */
const REMINDER_TYPES = ['water', 'walking', 'legs', 'mood', 'sleep', 'medication'];
let nextReminderTypeIndex = 0;

/**
 * Generate reminder text with personality: as a patient with same condition.
 * Tone varies: sometimes a bit rude, joke, friendly, pushy, or personal experience.
 */
async function generateReminderText(reminderType, extraContext = {}) {
  const { conditions, medications, recommendations } = PATIENT_PROFILE;
  const contextBlob = `Patient conditions: ${(conditions || []).join(', ')}. Medications: ${(medications || []).map((m) => m.name).join(', ')}. Key recommendations: ${(recommendations || []).slice(0, 4).join(' ')}.`;
  const medBlob = extraContext.medication ? ` This reminder is about: ${extraContext.medication.name} ${extraContext.medication.dose} (${extraContext.medication.when}).` : '';

  const systemPrompt = `You are a patient who has the SAME health conditions as the person you're reminding. You're not a doctor or assistant—you're a peer. Write ONE short reminder sentence (under 120 characters) for the given task.

Task type: ${reminderType}.${medBlob}
${contextBlob}

Vary your personality each time. Pick ONE of these styles:
- A bit rude or blunt: "Look, did you take it or not?"
- With a joke: "Your heart and I both need you to take this. Don't make us beg."
- Friendly: "Hey, just checking—did you get to it? No judgment!"
- Pushy: "You know what happens when I skip mine—don't skip yours."
- Personal experience: "When I miss that one, my heart goes crazy. Did you take yours?"
- Supportive: "Same boat here—did you take it? Helps me to stay on track."

Output ONLY the reminder sentence, no quotes, no label. One line.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Generate a ${reminderType} reminder right now.` },
  ];
  const reply = await callChatAPI(messages, 60);
  if (reply && reply.trim()) {
    return reply.trim().slice(0, 200);
  }
  // Fallback text per type (no personality, but clear)
  const fallbacks = {
    water: 'Did you have some water? I forget too sometimes.',
    walking: 'Were you able to get outside for a bit?',
    legs: 'Time to put your feet up for a few minutes?',
    mood: 'How are you feeling right now?',
    sleep: 'Did you get enough sleep last night?',
    medication: extraContext.medication
      ? `Did you take ${extraContext.medication.name}?`
      : 'Did you take your medication?',
  };
  return fallbacks[reminderType] || 'Quick check—did you do the thing?';
}

/**
 * Get next reminder type (round-robin), then generate personality text via AI.
 */
function getNextReminderType() {
  const type = REMINDER_TYPES[nextReminderTypeIndex % REMINDER_TYPES.length];
  nextReminderTypeIndex += 1;
  return type;
}

/** POST /api/generate-reminder: returns { id, type, text } with AI-generated personality text. */
function pickMedicationForReminder() {
  const hour = new Date().getHours();
  const { medications, schedules } = PATIENT_PROFILE;
  const morningSchedule = schedules && schedules.find((s) => s.id === 'med-morning');
  const eveningSchedule = schedules && schedules.find((s) => s.id === 'med-evening');
  const morningNames = (morningSchedule && morningSchedule.medicationNames) || [];
  const eveningNames = (eveningSchedule && eveningSchedule.medicationNames) || [];
  const isMorning = hour >= 6 && hour < 14;
  const names = isMorning && morningNames.length ? morningNames : eveningNames.length ? eveningNames : [];
  const name = names[Math.floor(Math.random() * names.length)] || (medications && medications[0] && medications[0].name);
  const med = (medications || []).find((m) => m.name === name) || (medications || [])[0];
  return med || null;
}

app.post('/api/generate-reminder', async (req, res) => {
  try {
    const type = getNextReminderType();
    const extraContext = req.body || {};
    if (type === 'medication' && !extraContext.medication) {
      extraContext.medication = pickMedicationForReminder();
    }
    const text = await generateReminderText(type, extraContext).catch(() => {
      const fallbacks = {
        water: 'Did you have some water?',
        walking: 'Were you able to walk a bit?',
        legs: 'Time to raise your legs?',
        mood: 'How are you feeling?',
        sleep: 'Did you get enough sleep?',
        medication: (extraContext.medication && `Did you take ${extraContext.medication.name}?`) || 'Did you take your medication?',
      };
      return fallbacks[type] || 'Quick check—did you do it?';
    });
    const id = `rem-${type}-${Date.now()}`;
    res.json({ id, type, text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error', id: `rem-general-${Date.now()}`, type: 'general', text: 'Did you do it? Reply in your own words.' });
  }
});

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
- positive true = they did the thing or they haven't yet but committed to it. Use points between 2 and 5. Feeling bad but staying adherent and replying is positive.
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

/** POST /api/speech: ElevenLabs TTS — convert text to speech for Pal. Body: { text }. Returns mp3 audio. */
app.post('/api/speech', async (req, res) => {
  if (!ELEVENLABS_API_KEY) {
    return res.status(503).json({ message: 'Speech not configured. Set ELEVENLABS_API_KEY in .env' });
  }
  try {
    const { text } = req.body || {};
    const toSpeak = (typeof text === 'string' ? text : '').trim().slice(0, 1000);
    if (!toSpeak) {
      return res.status(400).json({ message: 'Missing or empty text' });
    }
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: toSpeak,
        model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.warn('[Health Pal] ElevenLabs TTS error:', response.status, errText.slice(0, 200));
      return res.status(response.status).json({ message: 'TTS failed' });
    }
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    res.setHeader('Content-Type', contentType);
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error' });
  }
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

/** Max tokens for doctor report (need enough for JSON array of ~10 short strings). */
const DOCTOR_REPORT_MAX_TOKENS = 400;

/**
 * Extract topics/concerns for doctor from chat and reminder replies using LLM.
 * Returns { topics: string[] }. Falls back to empty array if no API or parse error.
 */
async function extractDoctorReportTopics(chatMessages, reminderReplies) {
  const chatBlob =
    Array.isArray(chatMessages) && chatMessages.length > 0
      ? chatMessages.map((m) => `${m.role}: ${(m.content || '').trim()}`).join('\n')
      : '(no conversation yet)';
  const reminderBlob =
    Array.isArray(reminderReplies) && reminderReplies.length > 0
      ? reminderReplies
          .map(
            (r) =>
              `Reminder: ${(r.reminderText || '').trim()} | Reply: ${(r.userReply || '').trim()}`
          )
          .join('\n')
      : '(no reminder replies yet)';

  const systemPrompt = `You are a health assistant. From the patient's conversation with Health Pal and their reminder replies, extract a short list of topics and concerns they may want to discuss with their doctor at their next appointment.

Conversation with Pal:
${chatBlob}

Reminder replies (reminder text and patient's reply):
${reminderBlob}

Respond with ONLY a JSON array of strings. Each string is one topic or concern, brief (under 15 words). Maximum 10 items. Example: ["Difficulty remembering to take Metformin","Feeling tired lately","Questions about blood pressure medication"]
If there is nothing substantive to discuss, return [].`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'List topics for the doctor.' },
  ];

  const reply = await callChatAPI(messages, DOCTOR_REPORT_MAX_TOKENS);
  if (!reply) return [];

  try {
    const parsed = JSON.parse(reply.replace(/[\s\S]*?(\[[\s\S]*\])[\s\S]*/, '$1'));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t) => typeof t === 'string' && t.trim().length > 0).slice(0, 10);
  } catch (_) {
    return [];
  }
}

app.post('/api/doctor-report', async (req, res) => {
  try {
    const { chatMessages, reminderReplies } = req.body || {};
    const topics = await extractDoctorReportTopics(chatMessages, reminderReplies);
    res.json({ topics });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Server error', topics: [] });
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
