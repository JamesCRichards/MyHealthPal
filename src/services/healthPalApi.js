/**
 * Health Pal API service.
 * Calls the backend /api/chat which uses Cursor API (or fallback) for conversational responses.
 */

const API_BASE = process.env.REACT_APP_API_URL || '';

const HEALTH_PAL_SYSTEM = `You are Health Pal, a friendly virtual health companion for a patient. You help with medication reminders, answer questions about their conditions in simple terms, and encourage healthy habits. Be concise, warm, and never give medical advice that could replace a doctor.`;

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
  const reply = data.reply || data.message || data.content || '';
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
