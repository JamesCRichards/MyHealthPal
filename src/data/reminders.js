import { PATIENT_PROFILE } from './patientProfile';

/**
 * Reply option for an interactive reminder. Positive = add care points, negative = subtract.
 */
export const REPLY_POSITIVE = 'positive';
export const REPLY_NEGATIVE = 'negative';
export const REPLY_NEUTRAL = 'neutral';

/**
 * Interactive reminder template: type, text, and reply options with point deltas.
 */
const INTERACTIVE_TEMPLATES = [
  // Medication reminders (filled from patient profile below)
  {
    type: 'medication',
    text: (ctx) => `Time to take ${ctx.medication.name} (${ctx.medication.dose}). Did you take it?`,
    replies: [
      { label: 'Yes, I took it', points: 5, kind: REPLY_POSITIVE },
      { label: 'No', points: -5, kind: REPLY_NEGATIVE },
      { label: 'Remind me later', points: 0, kind: REPLY_NEUTRAL },
    ],
  },
  {
    type: 'water',
    text: () => 'Remember to drink water. Did you have some?',
    replies: [
      { label: 'Yes', points: 3, kind: REPLY_POSITIVE },
      { label: 'No', points: -2, kind: REPLY_NEGATIVE },
      { label: 'Later', points: 0, kind: REPLY_NEUTRAL },
    ],
  },
  {
    type: 'walking',
    text: () => 'Were you walking outside today?',
    replies: [
      { label: 'Yes', points: 5, kind: REPLY_POSITIVE },
      { label: 'A bit', points: 2, kind: REPLY_POSITIVE },
      { label: 'No', points: -3, kind: REPLY_NEGATIVE },
    ],
  },
  {
    type: 'legs',
    text: () => 'Time to raise your legs. Did you elevate them for a bit?',
    replies: [
      { label: 'Yes', points: 5, kind: REPLY_POSITIVE },
      { label: 'Doing it now', points: 3, kind: REPLY_POSITIVE },
      { label: 'No / Later', points: -3, kind: REPLY_NEGATIVE },
    ],
  },
  {
    type: 'mood',
    text: () => 'How do you feel right now?',
    replies: [
      { label: 'Good', points: 2, kind: REPLY_POSITIVE },
      { label: 'Okay', points: 0, kind: REPLY_NEUTRAL },
      { label: 'Not great', points: -2, kind: REPLY_NEGATIVE },
    ],
  },
  {
    type: 'sleep',
    text: () => 'Did you get enough sleep last night?',
    replies: [
      { label: 'Yes', points: 2, kind: REPLY_POSITIVE },
      { label: 'Some', points: 0, kind: REPLY_NEUTRAL },
      { label: 'No', points: -2, kind: REPLY_NEGATIVE },
    ],
  },
];

let interactivePool = null;

/**
 * Build the pool of interactive reminders: water, walking, raising legs, plus mood and sleep.
 */
function buildInteractivePool() {
  if (interactivePool && interactivePool.length > 0) return interactivePool;
  const pool = [];
  ['water', 'walking', 'legs', 'mood', 'sleep'].forEach((type) => {
    const t = INTERACTIVE_TEMPLATES.find((x) => x.type === type);
    if (t) {
      pool.push({
        id: `int-${type}`,
        type,
        text: typeof t.text === 'function' ? t.text() : t.text({}),
        replies: t.replies,
      });
    }
  });
  interactivePool = pool;
  return pool;
}

let nextIndex = 0;

/**
 * Get the next reminder to show (round-robin every 2 minutes).
 * Returns one reminder object with id, type, text, replies.
 */
export function getNextInteractiveReminder() {
  const pool = buildInteractivePool();
  if (pool.length === 0) return null;
  const index = nextIndex % pool.length;
  nextIndex = (nextIndex + 1) % pool.length;
  return { ...pool[index], id: `${pool[index].id}-${Date.now()}` };
}

/**
 * Generate today's reminders for the list view: water, walking, raising legs.
 */
export function getTodaysReminders() {
  const now = new Date();
  const hour = now.getHours();

  return [
    { id: 'rem-water', title: 'Drink water', time: 'Throughout the day', completed: hour >= 12 },
    { id: 'rem-walking', title: 'Walk outside', time: 'When you can', completed: hour >= 10 },
    { id: 'rem-legs', title: 'Raise your legs', time: 'A few times daily', completed: hour >= 14 },
  ];
}
