import { Link } from 'react-router-dom';
import { Activity, FileText, Shield, Stethoscope, Clock, HeartPulse } from 'lucide-react';

export default function Landing() {
  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden="true" />
      <header className="landing-nav">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <HeartPulse size={22} strokeWidth={2.25} />
          </span>
          <span className="brand-name">MediConsult</span>
        </div>
        <div className="landing-nav-actions">
          <Link to="/login" className="btn btn-ghost">Sign in</Link>
          <Link to="/signup" className="btn btn-primary">Get started</Link>
        </div>
      </header>

      <main className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">Primary & urgent medical guidance</p>
          <h1 className="hero-brand">MediConsult</h1>
          <p className="hero-lead">
            Clear consultation support, report walkthroughs, and triage cues —
            built for moments when you need direction fast.
          </p>
          <div className="hero-cta">
            <Link to="/signup" className="btn btn-primary btn-lg">Start consultation</Link>
            <Link to="/login" className="btn btn-outline btn-lg">I have an account</Link>
          </div>
          <p className="hero-note">Informational support only — not a replacement for emergency or licensed care.</p>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-panel">
            <div className="hero-panel-top">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
            <div className="fake-chat">
              <div className="bubble bot">Describe your symptoms and I’ll help you decide primary vs urgent next steps.</div>
              <div className="bubble user">I’ve had a fever and sore throat for two days.</div>
              <div className="bubble bot">Primary care — see soon. Hydrate, track temperature, and watch for breathing trouble or very high fever.</div>
            </div>
          </div>
        </div>
      </main>

      <section className="landing-features">
        <h2>What you can do</h2>
        <p className="section-sub">One focused tool for guidance, reports, and urgency clarity.</p>
        <div className="feature-grid">
          <article>
            <Stethoscope size={28} />
            <h3>Primary consultant</h3>
            <p>Symptom-oriented guidance for everyday concerns and self-care planning.</p>
          </article>
          <article>
            <Clock size={28} />
            <h3>Urgent triage cues</h3>
            <p>Fast flags for red-alert language so you know when to seek urgent or emergency care.</p>
          </article>
          <article>
            <FileText size={28} />
            <h3>Report review</h3>
            <p>Paste or upload text labs for plain-language marker notes and follow-up suggestions.</p>
          </article>
          <article>
            <Shield size={28} />
            <h3>Private account</h3>
            <p>Secure signup/login with your health profile context saved for better consultations.</p>
          </article>
          <article>
            <Activity size={28} />
            <h3>Session history</h3>
            <p>Keep consultations organized so you can revisit advice and report summaries later.</p>
          </article>
          <article>
            <HeartPulse size={28} />
            <h3>Health-aware UI</h3>
            <p>Calm clinical design that keeps the focus on clarity when stress is high.</p>
          </article>
        </div>
      </section>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} MediConsult</span>
        <span>For education & orientation — always follow local emergency protocols.</span>
      </footer>
    </div>
  );
}
