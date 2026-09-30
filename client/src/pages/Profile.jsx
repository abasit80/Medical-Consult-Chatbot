import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../api';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
    blood_group: user?.blood_group || '',
    allergies: user?.allergies || '',
    chronic_conditions: user?.chronic_conditions || '',
    emergency_contact: user?.emergency_contact || '',
    date_of_birth: user?.date_of_birth || '',
    gender: user?.gender || ''
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setError('');
    try {
      const { user: updated } = await api.updateProfile(form);
      setUser(updated);
      setMsg('Profile saved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page profile-page">
      <header className="page-header">
        <div>
          <h1>Health profile</h1>
          <p>These details help tailor consultation context. They stay in your MediConsult account.</p>
        </div>
      </header>
      <form className="profile-form" onSubmit={onSubmit}>
        {msg && <div className="alert success">{msg}</div>}
        {error && <div className="alert error">{error}</div>}
        <div className="form-grid">
          <label className="span-2">
            Full name
            <input value={form.full_name} onChange={(e) => set('full_name', e.target.value)} required />
          </label>
          <label className="span-2">
            Email
            <input value={user?.email || ''} disabled />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </label>
          <label>
            Date of birth
            <input type="date" value={form.date_of_birth || ''} onChange={(e) => set('date_of_birth', e.target.value)} />
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
          <label className="span-2">
            Allergies
            <input value={form.allergies} onChange={(e) => set('allergies', e.target.value)} />
          </label>
          <label className="span-2">
            Chronic conditions
            <input value={form.chronic_conditions} onChange={(e) => set('chronic_conditions', e.target.value)} />
          </label>
          <label className="span-2">
            Emergency contact
            <input value={form.emergency_contact} onChange={(e) => set('emergency_contact', e.target.value)} placeholder="Name & phone" />
          </label>
        </div>
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
      </form>
    </div>
  );
}
