import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, setSession } from '../services/api';

export default function LoginPage() {
  const demoLoginLock = useRef(false);
  const [demoLoginBusy, setDemoLoginBusy] = useState(false);

  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const demoEmail = process.env.REACT_APP_DEMO_EMAIL || '';
  const demoPassword = process.env.REACT_APP_DEMO_PASSWORD || '';
  const demoCredentialsAvailable = Boolean(demoEmail && demoPassword);

  const submit = async (event, credentials) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await login(credentials?.email ?? email, credentials?.password ?? password);
      setSession(response.token, response.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logInAsDemo = async (event) => {
    if (demoLoginLock.current || !demoCredentialsAvailable) return;
    demoLoginLock.current = true;
    setDemoLoginBusy(true);
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
    try {
      await submit(event, { email: demoEmail, password: demoPassword });
    } finally {
      demoLoginLock.current = false;
      setDemoLoginBusy(false);
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
            onClick={logInAsDemo}
            disabled={demoLoginBusy || loading || !demoCredentialsAvailable}
            aria-label="Log In as Demo"
          >
            {demoLoginBusy ? 'Signing in as Demo...' : 'Log In as Demo'}
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
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
