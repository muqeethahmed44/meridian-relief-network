import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { FormStatus } from '../components/FormStatus';
import {
  firstError,
  LIMITS,
  validateEmail,
  validatePassword,
} from '../lib/validation';

export function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return (
      <Navigate
        to={from || (user.role === 'coordinator' ? '/coordinator' : '/volunteer')}
        replace
      />
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = firstError(validateEmail(email), validatePassword(password));
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const next = await login(email.trim().toLowerCase(), password);
      navigate(from || (next.role === 'coordinator' ? '/coordinator' : '/volunteer'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-panel">
      <h1 className="page-title">Sign in</h1>
      <p className="page-lead">
        Coordinators post needs. Volunteers find where they fit. Use your MRN account to continue.
      </p>

      <form className="panel form-grid" onSubmit={handleSubmit} noValidate>
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            maxLength={LIMITS.email.max}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={submitting}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={LIMITS.password.min}
            maxLength={LIMITS.password.max}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={submitting}
          />
        </label>

        <FormStatus error={error} loading={submitting ? 'Signing you in…' : null} />

        <div className="cta-row">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      </form>

      <p className="muted" style={{ marginTop: '1rem' }}>
        No account yet? <Link to="/register">Create one</Link>
      </p>
      <p className="muted">
        Demo: <code>coord.houston@meridianrelief.example</code> or{' '}
        <code>alex.rivera@example.com</code> / <code>password123</code>
      </p>
    </section>
  );
}
