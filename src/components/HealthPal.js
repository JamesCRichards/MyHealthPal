import React, { useState, useCallback, useEffect, useRef } from 'react';
import { getPatientContextSummary } from '../data/patientProfile';
import { getNextInteractiveReminder } from '../data/reminders';
import { sendMessage, getCarePoints, updateCarePoints, classifyReminderResponse } from '../services/healthPalApi';
import './HealthPal.css';

const REMINDER_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes - show next reminder / treat current as ignored
const IGNORED_POINTS = -5;

export default function HealthPal({
  carePoints: carePointsProp,
  onCarePointsChange,
  onPalMessage,
  open: controlledOpen,
  onOpenChange,
  hidePoints = false,
  hideToggleButton = false,
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = onOpenChange != null ? controlledOpen : internalOpen;
  const setOpen = onOpenChange != null ? onOpenChange : setInternalOpen;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [carePoints, setCarePointsState] = useState(carePointsProp ?? 0);
  const [activeReminder, setActiveReminder] = useState(null);
  const [reminderReplyText, setReminderReplyText] = useState('');
  const [reminderSubmitting, setReminderSubmitting] = useState(false);
  const patientContext = getPatientContextSummary();
  const reminderTimerRef = useRef(null);
  const activeReminderRef = useRef(null);

  const points = typeof carePointsProp === 'number' ? carePointsProp : carePoints;

  const loadCarePoints = useCallback(async () => {
    const p = await getCarePoints();
    setCarePointsState(p);
    if (onCarePointsChange) onCarePointsChange(p);
  }, [onCarePointsChange]);

  useEffect(() => {
    loadCarePoints();
  }, [loadCarePoints]);

  useEffect(() => {
    if (typeof carePointsProp === 'number') {
      setCarePointsState(carePointsProp);
    }
  }, [carePointsProp]);

  // Auto-show a new interactive reminder every 2 minutes. If one is already open, treat as ignored (negative points) then show next.
  useEffect(() => {
    function showNextReminder() {
      if (activeReminderRef.current) {
        updateCarePoints(IGNORED_POINTS).then((newPoints) => {
          setCarePointsState(newPoints);
          if (onCarePointsChange) onCarePointsChange(newPoints);
        });
        setActiveReminder(null);
        activeReminderRef.current = null;
      }
      const next = getNextInteractiveReminder();
      if (next) {
        setActiveReminder(next);
        activeReminderRef.current = next;
        setReminderReplyText('');
      }
    }

    const initialTimer = setTimeout(showNextReminder, 5000);
    reminderTimerRef.current = setInterval(showNextReminder, REMINDER_INTERVAL_MS);
    return () => {
      clearTimeout(initialTimer);
      if (reminderTimerRef.current) clearInterval(reminderTimerRef.current);
    };
  }, [onCarePointsChange]);

  const handleReminderReply = useCallback(
    async (text) => {
      if (!activeReminder || reminderSubmitting) return;
      setReminderSubmitting(true);
      try {
        const { points } = await classifyReminderResponse(activeReminder.type, activeReminder.text, text);
        const newPoints = await updateCarePoints(points);
        setCarePointsState(newPoints);
        if (onCarePointsChange) onCarePointsChange(newPoints);
        setActiveReminder(null);
        activeReminderRef.current = null;
        setReminderReplyText('');
      } finally {
        setReminderSubmitting(false);
      }
    },
    [activeReminder, reminderSubmitting, onCarePointsChange]
  );

  const handleReminderSubmit = (e) => {
    e.preventDefault();
    const text = reminderReplyText.trim();
    if (!text) return;
    handleReminderReply(text);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const nextMessages = [...messages, userMsg];
      const { reply, messagePoints } = await sendMessage(nextMessages, patientContext);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      if (onPalMessage && reply) onPalMessage(reply);
      const pts = typeof messagePoints === 'number' ? messagePoints : 3;
      const newPoints = await updateCarePoints(pts);
      setCarePointsState(newPoints);
      if (onCarePointsChange) onCarePointsChange(newPoints);
      loadCarePoints();
    } catch (err) {
      const errorMsg = `Sorry, I couldn't reach Health Pal right now. (${err.message}) Try again or check that the server is running.`;
      setMessages((prev) => [...prev, { role: 'assistant', content: errorMsg }]);
      if (onPalMessage) onPalMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const isEmbedded = hidePoints && hideToggleButton;

  return (
    <div className={`health-pal ${isEmbedded ? 'health-pal--embedded' : ''}`}>
      {!hidePoints && (
        <div className="health-pal-care-points" aria-live="polite">
          <span className="care-points-label">Care points</span>
          <span className="care-points-value">{points}</span>
        </div>
      )}

      {/* Auto-appearing interactive reminder popup */}
      {activeReminder && (
        <div className="health-pal-active-reminder" role="dialog" aria-labelledby="active-reminder-title">
          <h3 id="active-reminder-title" className="active-reminder-title">
            Reminder
          </h3>
          <p className="active-reminder-text">{activeReminder.text}</p>
          <p className="active-reminder-hint">Reply in your own words. No response within 2 minutes counts as missed.</p>
          <form className="active-reminder-form" onSubmit={handleReminderSubmit}>
            <input
              type="text"
              value={reminderReplyText}
              onChange={(e) => setReminderReplyText(e.target.value)}
              placeholder="e.g. Yes I took it / No / Not yet..."
              disabled={reminderSubmitting}
              aria-label="Your reply"
              autoFocus
            />
            <button type="submit" disabled={reminderSubmitting || !reminderReplyText.trim()}>
              {reminderSubmitting ? 'Checking...' : 'Send'}
            </button>
          </form>
        </div>
      )}

      {!hideToggleButton && (
        <button
          type="button"
          className="health-pal-toggle"
          onClick={() => setOpen(!open)}
          aria-label="Open Health Pal"
        >
          {open ? 'Close Health Pal' : 'Talk to Health Pal'}
        </button>
      )}

      {open && (
        <div className="health-pal-panel">
          <div className="health-pal-header">
            <h3>Health Pal</h3>
            <span className="health-pal-header-points">Care: {points}</span>
            <button
              type="button"
              className="health-pal-close"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="health-pal-messages">
            {/* Pal's area: welcome + Pal's replies (same place as his conversations) */}
            <div className="health-pal-pal-area">
              <span className="health-pal-pal-label">Pal</span>
              {messages.length === 0 && (
                <p className="health-pal-welcome">
                  Hi! I'm your Health Pal. Ask me about your medications, reminders, or general tips for diabetes, heart
                  failure, or blood pressure. Reply to the reminders that appear to earn care points!
                </p>
              )}
              {messages.map((m, i) =>
                m.role === 'assistant' ? (
                  <div key={i} className="message message-assistant">
                    {m.content}
                  </div>
                ) : null
              )}
              {loading && <div className="message message-assistant loading">Thinking...</div>}
            </div>
            {/* Your typing: your messages in one place */}
            <div className="health-pal-your-area">
              <span className="health-pal-your-label">You</span>
              {messages.filter((m) => m.role === 'user').length === 0 ? (
                <p className="health-pal-your-empty">Your messages will appear here.</p>
              ) : (
                messages.map((m, i) =>
                  m.role === 'user' ? (
                    <div key={i} className="message message-user">
                      {m.content}
                    </div>
                  ) : null
                )
              )}
            </div>
          </div>
          <form
            className="health-pal-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about medications or reminders..."
              disabled={loading}
              aria-label="Message Health Pal"
            />
            <button type="submit" disabled={loading}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
