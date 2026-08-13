import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError, type UserRole } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { FormStatus } from '../components/FormStatus';
import { SkillPicker } from '../components/SkillPicker';
import {
  firstError,
  LIMITS,
  validateEmail,
  validateFullName,
  validatePassword,
  validateSkills,
} from '../lib/validation';

export function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('volunteer');
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return (
      <Navigate to={user.role === 'coordinator' ? '/coordinator' : '/volunteer'} replace />
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = firstError(
      validateFullName(fullName),
      validateEmail(email),
      validatePassword(password),
      role === 'volunteer' ? validateSkills(skills, { required: false }) : null
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const next = await register({
        email: email.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
        role,
        skills: role === 'volunteer' && skills.length ? skills : undefined,
      });
      navigate(next.role === 'coordinator' ? '/coordinator' : '/volunteer');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-panel">
      <h1 className="page-title">Create an account</h1>
      <p className="page-lead">
        Register as a chapter coordinator or a volunteer. You’ll be signed in right away.
      </p>

      <form className="panel form-grid" onSubmit={handleSubmit} noValidate>
        <label>
          Full name
          <input
            required
            minLength={LIMITS.fullName.min}
            maxLength={LIMITS.fullName.max}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Alex Rivera"
            disabled={submitting}
          />
        </label>

        <div className="form-grid two">
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
              autoComplete="new-password"
              required
              minLength={LIMITS.password.min}
              maxLength={LIMITS.password.max}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              disabled={submitting}
            />
          </label>
        </div>

        <label>
          I am a…
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={submitting}
          >
            <option value="volunteer">Volunteer</option>
            <option value="coordinator">Chapter coordinator</option>
          </select>
        </label>

        {role === 'volunteer' ? (
          <div>
            <span className="field-label">Skills (optional)</span>
            <SkillPicker
              selected={skills}
              onChange={setSkills}
              disabled={submitting}
              optional
            />
          </div>
        ) : null}

        <FormStatus error={error} loading={submitting ? 'Creating your account…' : null} />

        <div className="cta-row">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </div>
      </form>

      <p className="muted" style={{ marginTop: '1rem' }}>
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </section>
  );
}
