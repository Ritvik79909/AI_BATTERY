import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaBrain, FaRobot, FaUser, FaCar } from 'react-icons/fa';
import { MdAutoAwesome } from 'react-icons/md';
import Navbar from '../components/Navbar';
import { vehicleService } from '../services/vehicleService';
import api from '../services/api';
import type { Vehicle } from '../types/vehicle';
import './AiCoachingPage.css';

/* ─── Types ─────────────────────────────────────────────────────── */

interface AiCoachResponse {
  answer: string;
  issueType?: string;
  recommendations?: string[];
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  issueType?: string;
  recommendations?: string[];
  timestamp: Date;
}

/* ─── Suggested questions ──────────────────────────────────────── */

const SUGGESTED_QUESTIONS = [
  'Why is my battery health decreasing?',
  'How can I improve battery lifespan?',
  'Is fast charging harming my battery?',
  'How long will my battery last?',
  'What are my charging habits like?',
];

/* ─── Issue-type colour map ────────────────────────────────────── */

const issueTypeColor: Record<string, string> = {
  DEGRADATION: '#ef4444',
  CHARGING: '#f59e0b',
  TEMPERATURE: '#f97316',
  GENERAL: '#6366f1',
};

/* ─── Main Component ─────────────────────────────────────────────── */

const AiCoachingPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Auto-scroll on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* Load vehicles once */
  useEffect(() => {
    (async () => {
      try {
        const data = await vehicleService.getVehicles();
        setVehicles(data);
        if (data.length > 0) {
          setSelectedVehicleId(data[0].id);
          // Greet immediately once a vehicle is selected
          addWelcomeMessage(data[0]);
        }
      } catch {
        /* no-op – show empty selection state */
      } finally {
        setVehiclesLoading(false);
      }
    })();
  }, []);

  const addWelcomeMessage = (v: Vehicle) => {
    setMessages([
      {
        role: 'ai',
        content: `Hi there! 👋 I'm your AI Battery Coach. I'm here to help you understand and optimise the battery health of your **${v.nickname} (${v.make} ${v.model})**.\n\nFeel free to ask me anything — from charging tips to degradation causes!`,
        timestamp: new Date(),
      },
    ]);
  };

  /* Vehicle change → reset chat */
  const handleVehicleChange = (vid: string) => {
    setSelectedVehicleId(vid);
    const v = vehicles.find((x) => x.id === vid);
    if (v) addWelcomeMessage(v);
  };

  /* ── Send message ──────────────────────────────────────────────── */
  const sendMessage = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || !selectedVehicleId || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post<AiCoachResponse>('/ai-coach/query', {
        vehicleId: selectedVehicleId,
        question,
      });

      const aiMsg: ChatMessage = {
        role: 'ai',
        content: res.data.answer,
        issueType: res.data.issueType,
        recommendations: res.data.recommendations,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault();
      sendMessage();
    }
  };

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="aic-shell">
      <Navbar activeTab="ai coach" />

      <div className="aic-body">
        {/* ─── Sidebar ─────────────────────────────────────────── */}
        <aside className="aic-sidebar">
          {/* Brand header */}
          <div className="aic-sidebar-brand">
            <div className="aic-brand-icon">
              <FaBrain size={22} />
            </div>
            <div>
              <div className="aic-brand-title">Battery Coach</div>
              <div className="aic-brand-sub">Powered by AI</div>
            </div>
          </div>

          {/* Vehicle selector */}
          <div className="aic-vehicle-section">
            <div className="aic-section-label">
              <FaCar size={13} />
              Active Vehicle
            </div>
            {vehiclesLoading ? (
              <div className="aic-spinner-sm" />
            ) : vehicles.length === 0 ? (
              <p className="aic-no-vehicles">No vehicles found. Add one first.</p>
            ) : (
              <select
                id="aic-vehicle-select"
                name="vehicleId"
                value={selectedVehicleId || ''}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="aic-vehicle-select"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nickname} — {v.make} {v.model}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Suggested questions */}
          <div className="aic-suggestions-section">
            <div className="aic-section-label">
              <MdAutoAwesome size={14} />
              Quick Questions
            </div>
            <div className="aic-suggestions-list">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  className="aic-suggestion-btn"
                  onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Info footer */}
          <div className="aic-sidebar-footer">
            <span>🔒</span>
            <span>Your data is private & secure</span>
          </div>
        </aside>

        {/* ─── Chat Area ───────────────────────────────────────── */}
        <main className="aic-chat-area">
          {/* Messages */}
          <div className="aic-messages-scroll">
            <div className="aic-messages-inner">

              {messages.length === 0 && !vehiclesLoading && vehicles.length === 0 && (
                <div className="aic-empty-prompt">
                  <FaRobot size={56} className="aic-empty-icon" />
                  <h2>No vehicle selected</h2>
                  <p>Add a vehicle to start chatting with your AI coach.</p>
                </div>
              )}

              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={i} className={`aic-msg-row ${isUser ? 'aic-msg-row--user' : 'aic-msg-row--ai'}`}>
                    {/* Avatar */}
                    {!isUser && (
                      <div className="aic-avatar aic-avatar--ai">
                        <FaBrain size={16} />
                      </div>
                    )}

                    <div className={`aic-bubble ${isUser ? 'aic-bubble--user' : 'aic-bubble--ai'}`}>
                      {/* Role label */}
                      <div className="aic-bubble-role">
                        {isUser ? 'You' : '🧠 Battery Coach'}
                      </div>

                      {/* Content */}
                      <div className="aic-bubble-content">
                        {msg.content.split('\n').map((line, li) => (
                          <p key={li} className={line === '' ? 'aic-spacer' : ''}>
                            {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                          </p>
                        ))}
                      </div>

                      {/* Issue type badge */}
                      {msg.issueType && (
                        <div
                          className="aic-issue-badge"
                          style={{ background: (issueTypeColor[msg.issueType] ?? '#6366f1') + '22', color: issueTypeColor[msg.issueType] ?? '#6366f1', borderColor: (issueTypeColor[msg.issueType] ?? '#6366f1') + '44' }}
                        >
                          Issue type: {msg.issueType}
                        </div>
                      )}

                      {/* Recommendations */}
                      {msg.recommendations && msg.recommendations.length > 0 && (
                        <div className="aic-recommendations">
                          <div className="aic-rec-title">✅ Recommendations</div>
                          <ul className="aic-rec-list">
                            {msg.recommendations.map((rec, j) => (
                              <li key={j} className="aic-rec-item">
                                <span className="aic-rec-dot" />
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="aic-bubble-time">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {isUser && (
                      <div className="aic-avatar aic-avatar--user">
                        <FaUser size={14} />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Typing indicator */}
              {loading && (
                <div className="aic-msg-row aic-msg-row--ai">
                  <div className="aic-avatar aic-avatar--ai">
                    <FaBrain size={16} />
                  </div>
                  <div className="aic-bubble aic-bubble--ai aic-bubble--typing">
                    <div className="aic-typing-indicator">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* ─── Input bar ───────────────────────────────────────── */}
          <div className="aic-input-bar">
            {/* Mobile suggested pills */}
            <div className="aic-mobile-suggestions">
              {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
                <button
                  key={i}
                  className="aic-mobile-pill"
                  onClick={() => {
                    setInput(q);
                    inputRef.current?.focus();
                  }}
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="aic-input-row">
              <input
                ref={inputRef}
                id="aic-chat-input"
                name="chatInput"
                type="text"
                className="aic-input"
                placeholder="Ask about battery health, charging habits, or optimisation…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading || !selectedVehicleId}
                autoComplete="off"
              />
              <button
                className="aic-send-btn"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim() || !selectedVehicleId}
                aria-label="Send message"
              >
                {loading ? (
                  <div className="aic-send-spinner" />
                ) : (
                  <FaPaperPlane size={18} />
                )}
              </button>
            </div>
            <p className="aic-input-hint">Press Enter to send · AI responses are advisory only</p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AiCoachingPage;
