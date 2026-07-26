import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, setSession } from '../services/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const demoEmail = process.env.REACT_APP_DEMO_EMAIL || '';
  const demoPassword = process.env.REACT_APP_DEMO_PASSWORD || '';
  const demoCredentialsAvailable = Boolean(demoEmail && demoPassword);

  const fillDemoCredentials = () => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  };

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

        <div className="demo-credentials-panel">
          <div>
            <strong>Demo access</strong>
            <span>Fill the provisioned local account credentials.</span>
          </div>
          <button
            type="button"
            className="btn-demo-credentials"
            onClick={fillDemoCredentials}
            disabled={!demoCredentialsAvailable}
            aria-label="Auto Fill Demo Credentials"
          >
            Auto Fill Demo Credentials
          </button>
          {!demoCredentialsAvailable && (
            <small>Demo credentials are unavailable. Restart the app with ./start.sh.</small>
          )}
        </div>

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
      </form>
    </div>
  );
}
