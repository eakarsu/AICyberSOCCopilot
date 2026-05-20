import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, setSession } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@socops.io');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const r = await login(email, password);
      setSession(r.token, r.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <h1>AI CyberSOC Copilot</h1>
        <p className="login-sub">Sign in to your SOC workspace</p>

        {error && <div className="ai-error" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="login-hint">
          Demo creds: <code>admin@socops.io</code> / <code>admin123</code>
        </p>
      </form>
    </div>
  );
}
