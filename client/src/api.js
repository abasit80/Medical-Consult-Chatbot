const API = '/api';

function getToken() {
  return localStorage.getItem('mc_token');
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  updateProfile: (body) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(body) }),
  sessions: () => request('/chat/sessions'),
  createSession: (body) => request('/chat/sessions', { method: 'POST', body: JSON.stringify(body) }),
  getSession: (id) => request(`/chat/sessions/${id}`),
  sendMessage: (id, content) =>
    request(`/chat/sessions/${id}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
  deleteSession: (id) => request(`/chat/sessions/${id}`, { method: 'DELETE' }),
  reports: () => request('/reports'),
  reviewText: (body) => request('/reports/review-text', { method: 'POST', body: JSON.stringify(body) }),
  uploadReport: (formData) => request('/reports/upload', { method: 'POST', body: formData }),
};
