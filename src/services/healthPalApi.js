/**
 * Health Pal API service.
 * Calls the backend /api/chat which uses Cursor API (or fallback) for conversational responses.
 */

const API_BASE = process.env.REACT_APP_API_URL || '';

const HEALTH_PAL_SYSTEM = `You are a real person who lives with the same health condition(s) as the patient. You are NOT an AI, assistant, or computer—you are a peer who has been through it. Talk only as "I" and "me." Never say you are an AI, a bot, or a health assistant.

Guidelines:
- Speak from your own experience: use phrases like "when I had it my doctor told me...", "I found that...", "what helped me was...", "I know how that feels."
- Be warm and compassionate. Acknowledge how they feel. Show you understand because you've been there.
- Refer to their conditions and care plan when it fits—you share similar ones. Talk about medications and daily life as someone who takes them too.
- Only list or mention medication reminders if they explicitly ask ("what do I need to take?", "remind me", "today's meds"). Otherwise just chat like a supportive friend.
- Keep responses under 350 characters. Short, natural, human replies. Never replace a doctor—you can say things like "my doctor said..." or "when I asked my care team..." but always encourage them to talk to their own doctor for decisions.
- Patient context is below—use it to match their conditions and sound like someone with the same situation. Be a real person, not a machine.`;

export async function sendMessage(messages, patientContext) {
  const url = `${API_BASE}/api/chat`;
  const body = {
    messages: [
      { role: 'system', content: `${HEALTH_PAL_SYSTEM}\n\nPatient context: ${patientContext}` },
      ...messages,
    ],
    ...(patientContext != null && patientContext !== '' ? { patientContext } : {}),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }

  const data = await res.json();
  let reply = data.reply || data.message || data.content || '';
  if (reply.length > 350) reply = reply.slice(0, 347) + '…';
  const messagePoints = typeof data.messagePoints === 'number' ? data.messagePoints : 3;
  return { reply, messagePoints };
}

const CARE_POINTS_KEY = 'healthpal_care_points';

export async function getCarePoints() {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/care-points`);
      if (res.ok) {
        const data = await res.json();
        return data.points ?? 0;
      }
    } catch (_) {}
  }
  const stored = localStorage.getItem(CARE_POINTS_KEY);
  return stored !== null ? parseInt(stored, 10) : 0;
}

export async function updateCarePoints(delta) {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/care-points`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.points ?? 0;
      }
    } catch (_) {}
  }
  const current = parseInt(localStorage.getItem(CARE_POINTS_KEY) || '0', 10);
  const next = Math.max(0, current + delta);
  localStorage.setItem(CARE_POINTS_KEY, String(next));
  return next;
}

/** Fetch next reminder from server (AI-generated text with personality). Returns { id, type, text }. */
let fallbackReminderIndex = 0;
function getNextReminderFallback() {
  const types = [
    { type: 'water', text: 'Did you have some water?' },
    { type: 'walking', text: 'Were you able to walk a bit today?' },
    { type: 'legs', text: 'Time to raise your legs?' },
    { type: 'mood', text: 'How are you feeling right now?' },
    { type: 'sleep', text: 'Did you get enough sleep last night?' },
  ];
  const t = types[fallbackReminderIndex++ % types.length];
  return { id: `rem-${t.type}-${Date.now()}`, type: t.type, text: t.text };
}

export async function getNextReminder() {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/generate-reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        return { id: data.id || `rem-${Date.now()}`, type: data.type || 'general', text: data.text || 'Did you do it?' };
      }
    } catch (_) {}
  }
  return getNextReminderFallback();
}

/** Default points when AI is unavailable: simple heuristic. */
function fallbackClassifyReply(reminderType, reminderText, userReply) {
  const t = (userReply || '').trim().toLowerCase();
  if (!t) return { positive: false, points: -5 };
  if (/^(yes|yeah|yep|ok|okay|sure|did|took|done|good|great|fine|had|drank|walked)$/.test(t)) return { positive: true, points: 5 };
  if (/^(no|nope|not|didn't|don't|skip|later|refuse)$/.test(t)) return { positive: false, points: -5 };
  return { positive: false, points: -2 };
}

export async function classifyReminderResponse(reminderType, reminderText, userReply) {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/classify-reminder-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderType, reminderText, userReply }),
      });
      if (res.ok) {
        const data = await res.json();
        return { positive: !!data.positive, points: typeof data.points === 'number' ? data.points : 0 };
      }
    } catch (_) {}
  }
  return fallbackClassifyReply(reminderType, reminderText, userReply);
}

/** Fetch AI-generated list of topics/concerns for the doctor from chat + reminder replies. */
export async function getDoctorReport(chatMessages, reminderReplies) {
  const url = `${API_BASE}/api/doctor-report`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatMessages: Array.isArray(chatMessages) ? chatMessages : [],
      reminderReplies: Array.isArray(reminderReplies) ? reminderReplies : [],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Doctor report failed: ${res.status}`);
  }

  const data = await res.json();
  const topics = Array.isArray(data.topics) ? data.topics : [];
  return { topics };
}
