import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('mc_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.me()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem('mc_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const { token, user } = await api.login({ email, password });
    localStorage.setItem('mc_token', token);
    setUser(user);
    return user;
  }

  async function signup(payload) {
    const { token, user } = await api.signup(payload);
    localStorage.setItem('mc_token', token);
    setUser(user);
    return user;
  }

  function logout() {
    localStorage.removeItem('mc_token');
    setUser(null);
  }

  async function refreshProfile() {
    const { user } = await api.me();
    setUser(user);
    return user;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshProfile, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
