import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Send, Trash2, Stethoscope, Siren, FileSearch, AlertTriangle } from 'lucide-react';
import { api } from '../api';
import { renderMarkdown } from '../markdown';

const TYPES = [
  { id: 'primary', label: 'Primary', icon: Stethoscope, hint: 'Everyday concerns' },
  { id: 'urgent', label: 'Urgent', icon: Siren, hint: 'Same-day guidance' },
  { id: 'report_review', label: 'Reports', icon: FileSearch, hint: 'Walk through labs' },
];

export default function Consult() {
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [session, setSession] = useState(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [urgency, setUrgency] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const bottomRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    const sid = searchParams.get('session');
    if (sid) openSession(Number(sid));
  }, [searchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function loadSessions() {
    const { sessions } = await api.sessions();
    setSessions(sessions);
    if (!activeId && sessions[0] && !searchParams.get('session')) {
      openSession(sessions[0].id);
    }
  }

  async function openSession(id) {
    setActiveId(id);
    const data = await api.getSession(id);
    setSession(data.session);
    setMessages(data.messages);
    setUrgency({ level: data.session.urgency_level });
  }

  async function createSession(type) {
    setBusy(true);
    try {
      const data = await api.createSession({ consultation_type: type });
      setSessions((s) => [data.session, ...s]);
      setActiveId(data.session.id);
      setSession(data.session);
      setMessages(data.messages);
      setUrgency(null);
      setSearchParams({});
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    const content = input.trim();
    if (!content || !activeId || busy) return;
    setInput('');
    setBusy(true);
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, role: 'user', content }]);
    try {
      const data = await api.sendMessage(activeId, content);
      setMessages(data.messages);
      setSession(data.session);
      setUrgency(data.urgency);
      const { sessions } = await api.sessions();
      setSessions(sessions);
    } catch (err) {
      setMessages((m) => [...m, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Sorry — ${err.message}`
      }]);
    } finally {
      setBusy(false);
    }
  }

  async function removeSession(id, e) {
    e.stopPropagation();
    await api.deleteSession(id);
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    if (activeId === id) {
      if (next[0]) openSession(next[0].id);
      else {
        setActiveId(null);
        setMessages([]);
        setSession(null);
      }
    }
  }

  return (
    <div className="consult-layout">
      <aside className="session-rail">
        <div className="rail-head">
          <h2>Consultations</h2>
          <div className="type-actions">
            {TYPES.map((t) => (
              <button key={t.id} type="button" className="type-chip" onClick={() => createSession(t.id)} title={t.hint}>
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="session-list">
          {sessions.length === 0 && (
            <p className="empty-rail">Start a primary, urgent, or report consultation.</p>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`session-item ${activeId === s.id ? 'active' : ''}`}
              onClick={() => { setSearchParams({}); openSession(s.id); }}
            >
              <div>
                <strong>{s.title}</strong>
                <small>
                  <span className={`badge badge-${s.urgency_level || 'routine'}`}>{s.urgency_level || 'routine'}</span>
                  {' · '}{s.consultation_type.replace('_', ' ')}
                </small>
              </div>
              <span
                className="icon-btn"
                role="button"
                tabIndex={0}
                onClick={(e) => removeSession(s.id, e)}
                onKeyDown={(e) => e.key === 'Enter' && removeSession(s.id, e)}
              >
                <Trash2 size={14} />
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="chat-pane">
        {!activeId ? (
          <div className="chat-empty">
            <Plus size={36} />
            <h2>Begin a consultation</h2>
            <p>Choose Primary for everyday guidance, Urgent for same-day concerns, or Reports to review labs.</p>
            <div className="empty-actions">
              {TYPES.map((t) => (
                <button key={t.id} type="button" className="btn btn-outline" onClick={() => createSession(t.id)}>
                  <t.icon size={16} /> {t.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <header className="chat-header">
              <div>
                <h1>{session?.title || 'Consultation'}</h1>
                <p>Personal medical guidance · informational only</p>
              </div>
              {urgency?.level && (
                <div className={`urgency-pill level-${urgency.level}`}>
                  <AlertTriangle size={16} />
                  {urgency.label || urgency.level}
                </div>
              )}
            </header>

            <div className="message-stream">
              {messages.map((m) => (
                <div key={m.id} className={`msg ${m.role}`}>
                  <div
                    className="msg-body"
                    dangerouslySetInnerHTML={{
                      __html: m.role === 'assistant' ? renderMarkdown(m.content) : escapeText(m.content)
                    }}
                  />
                </div>
              ))}
              {busy && (
                <div className="msg assistant">
                  <div className="msg-body typing"><span /><span /><span /></div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <form
              className="composer"
              onSubmit={(e) => { e.preventDefault(); send(); }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe symptoms, ask a question, or paste report details…"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button type="submit" className="btn btn-primary send-btn" disabled={busy || !input.trim()}>
                <Send size={18} />
              </button>
            </form>
            <p className="composer-disclaimer">
              Not for emergencies. If this is life-threatening, call local emergency services.
              Prefer structured report review? <button type="button" className="linkish" onClick={() => navigate('/app/reports')}>Open Reports</button>
            </p>
          </>
        )}
      </section>
    </div>
  );
}

function escapeText(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br />');
}
