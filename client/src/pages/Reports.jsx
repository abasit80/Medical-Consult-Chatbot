import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ClipboardPaste, FileText, ArrowRight } from 'lucide-react';
import { api } from '../api';
import { renderMarkdown } from '../markdown';

export default function Reports() {
  const [text, setText] = useState('');
  const [reportType, setReportType] = useState('blood_work');
  const [reports, setReports] = useState([]);
  const [review, setReview] = useState(null);
  const [lastSessionId, setLastSessionId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.reports().then((d) => setReports(d.reports)).catch(() => {});
  }, []);

  async function reviewPasted(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api.reviewText({ text, report_type: reportType, create_session: true });
      setReview(data.review);
      setLastSessionId(data.sessionId);
      const list = await api.reports();
      setReports(list.reports);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('report', file);
      fd.append('report_type', reportType);
      const data = await api.uploadReport(fd);
      setReview(data.review);
      setLastSessionId(data.sessionId);
      const list = await api.reports();
      setReports(list.reports);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }

  return (
    <div className="page reports-page">
      <header className="page-header">
        <div>
          <h1>Report review</h1>
          <p>Paste lab text or upload a .txt/.csv file for plain-language marker notes.</p>
        </div>
      </header>

      <div className="reports-grid">
        <form className="report-editor" onSubmit={reviewPasted}>
          <div className="editor-toolbar">
            <label className="report-type-field">
              Report type
              <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="blood_work">Blood work</option>
                <option value="vitals">Vitals</option>
                <option value="imaging">Imaging notes</option>
                <option value="prescription">Prescription</option>
                <option value="discharge">Discharge</option>
                <option value="general">General</option>
              </select>
            </label>
            <div className="toolbar-actions">
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.csv,.md,.json,text/*"
                className="file-input-hidden"
                onChange={onUpload}
              />
              <button
                type="button"
                className="btn btn-outline btn-sm upload-btn"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={16} /> Upload file
              </button>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste report text here… e.g. Glucose: 98, HbA1c: 5.4, BP: 120/80"
            rows={14}
            required
          />
          {error && <div className="alert error">{error}</div>}
          <button className="btn btn-primary" disabled={busy || !text.trim()}>
            <ClipboardPaste size={16} /> {busy ? 'Reviewing…' : 'Review report'}
          </button>
        </form>

        <div className="report-result">
          {review ? (
            <>
              <div className={`urgency-pill level-${review.urgency?.level}`}>
                {review.urgency?.label || review.urgency?.level}
              </div>
              <div
                className="review-md"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(review.aiSummary) }}
              />
              {lastSessionId && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate(`/app?session=${lastSessionId}`)}
                >
                  Open in consult <ArrowRight size={16} />
                </button>
              )}
            </>
          ) : (
            <div className="result-placeholder">
              <FileText size={40} />
              <h3>Your review will appear here</h3>
              <p>Recognizes common markers like glucose, HbA1c, lipids, hemoglobin, TSH, creatinine, and blood pressure.</p>
            </div>
          )}
        </div>
      </div>

      <section className="past-reports">
        <h2>Recent reviews</h2>
        {reports.length === 0 ? (
          <p className="muted">No reports yet.</p>
        ) : (
          <ul className="report-list">
            {reports.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>{r.original_name}</strong>
                  <small>{r.report_type} · {new Date(r.uploaded_at).toLocaleString()} · {r.review_status}</small>
                </div>
                {r.session_id && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(`/app?session=${r.session_id}`)}>
                    Open chat
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
