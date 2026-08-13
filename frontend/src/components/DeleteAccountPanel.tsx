import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError, deleteAccount } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { FormStatus } from './FormStatus';
import { LIMITS, validatePassword } from '../lib/validation';

type Props = {
  variant?: 'page' | 'modal';
  onClose?: () => void;
};

export function DeleteAccountPanel({ variant = 'page', onClose }: Props) {
  const { user, clearUser } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      setError('Type DELETE to confirm account deletion.');
      return;
    }

    setError(null);
    setDeleting(true);
    try {
      await deleteAccount(password);
      clearUser();
      onClose?.();
      navigate('/register', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete account. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  const body = (
    <>
      <div className="section-head">
        <div>
          <h2 id="delete-account-title">Delete account</h2>
          <p>
            Permanently remove <strong>{user?.email}</strong> from Meridian Relief Network. This
            cannot be undone.
            {user?.role === 'volunteer'
              ? ' Your matches will be removed and need rankings refreshed.'
              : ' Needs you posted will remain, but without your name as poster.'}
          </p>
        </div>
      </div>

      <form className="form-grid" onSubmit={handleSubmit} noValidate>
        <label>
          Current password
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={LIMITS.password.min}
            maxLength={LIMITS.password.max}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Confirm with your password"
            disabled={deleting}
          />
        </label>

        <label>
          Type DELETE to confirm
          <input
            required
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            disabled={deleting}
          />
        </label>

        <FormStatus error={error} loading={deleting ? 'Deleting your account…' : null} />

        <div className="cta-row">
          {onClose ? (
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={deleting}>
              Cancel
            </button>
          ) : null}
          <button type="submit" className="btn btn-danger" disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>
      </form>
    </>
  );

  if (variant === 'modal') {
    return <div className="danger-panel modal-panel">{body}</div>;
  }

  return (
    <section className="panel danger-panel" style={{ marginTop: '1.25rem' }}>
      {body}
    </section>
  );
}
