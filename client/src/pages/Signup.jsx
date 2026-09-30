import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HeartPulse } from 'lucide-react';
import { useAuth } from '../AuthContext';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    blood_group: '',
    allergies: '',
    chronic_conditions: '',
    gender: ''
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signup(form);
      navigate('/app');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-aside">
        <Link to="/" className="brand brand-light">
          <span className="brand-mark"><HeartPulse size={22} /></span>
          <span className="brand-name">MediConsult</span>
        </Link>
        <h2>Create your<br />health space.</h2>
        <p>Save allergies and conditions so consultations stay personalized and safer.</p>
      </div>
      <div className="auth-panel">
        <form className="auth-form signup-form" onSubmit={onSubmit}>
          <h1>Create account</h1>
          <p className="muted">Join MediConsult in under a minute</p>
          {error && <div className="alert error">{error}</div>}
          <div className="form-grid">
            <label className="span-2">
              Full name
              <input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required />
            </label>
            <label className="span-2">
              Email
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
            </label>
            <label className="span-2">
              Password
              <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} />
            </label>
            <label>
              Phone
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </label>
            <label>
              Gender
              <select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </label>
            <label>
              Blood group
              <select value={form.blood_group} onChange={(e) => set('blood_group', e.target.value)}>
                <option value="">Unknown</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </label>
            <label>
              Allergies
              <input value={form.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="e.g. Penicillin" />
            </label>
            <label className="span-2">
              Chronic conditions
              <input value={form.chronic_conditions} onChange={(e) => set('chronic_conditions', e.target.value)} placeholder="e.g. Asthma, hypertension" />
            </label>
          </div>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
          <p className="auth-switch">
            Already registered? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
