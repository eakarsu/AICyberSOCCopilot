import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, setSession } from '../services/api';

function __demoAutofill() {
  (async () => {
    let email = "";
    let password = "";
    try {
      const response = await fetch("/api/auth/demo-credentials", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        email = data.email || data.username || "";
        password = data.password || "";
      }
    } catch (error) {
      /* fall back to build-time credentials below */
    }
    if (!email || !password) {
      const env = (typeof process !== "undefined" && process.env) ? process.env : {};
      email = email || env.REACT_APP_DEMO_EMAIL || env.VITE_DEMO_EMAIL || "";
      password = password || env.REACT_APP_DEMO_PASSWORD || env.VITE_DEMO_PASSWORD || "";
    }
    const form = document.querySelector("form");
    const setValue = (element, value) => {
      if (!element) return;
      const prototype = element.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value").set;
      setter.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const scope = form || document;
    setValue(scope.querySelector('input[type="email"], input[name="email"], input[name="username"]') || scope.querySelectorAll("input")[0], email);
    setValue(scope.querySelector('input[type="password"], input[name="password"]') || scope.querySelectorAll("input")[1], password);
    window.setTimeout(() => {
      if (form && typeof form.requestSubmit === "function") {
        form.requestSubmit();
      } else {
        const submit = scope.querySelector('button[type="submit"], input[type="submit"]');
        if (submit) submit.click();
      }
    }, 50);
  })();
}

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
            onClick={__demoAutofill}
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
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
