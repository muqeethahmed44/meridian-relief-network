import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, updateSkills } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { DeleteAccountPanel } from '../../components/DeleteAccountPanel';
import { FormStatus } from '../../components/FormStatus';
import { SkillPicker } from '../../components/SkillPicker';
import { parseSkills, SAMPLE_SKILL_OPENINGS } from '../../data/skillsCatalog';
import { validateSkills } from '../../lib/validation';

export function VolunteerProfile() {
  const { user, refresh, clearUser } = useAuth();
  const [skills, setSkills] = useState<string[]>(() => parseSkills(user?.skills));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    void refresh().finally(() => {
      if (active) setCheckingSession(false);
    });
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    setSkills(parseSkills(user?.skills));
  }, [user]);

  function applySampleOpening(openingSkills: string[]) {
    setSkills((prev) => [...new Set([...prev, ...openingSkills])]);
    setSuccess(null);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validateSkills(skills);
    if (validationError) {
      setError(validationError);
      setSuccess(null);
      return;
    }

    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const result = await updateSkills(skills);
      await refresh();
      setSuccess(
        result.warning ||
          (result.embedded
            ? 'Skills saved. Suggested rankings for coordinators were refreshed.'
            : 'Skills saved to your profile.')
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearUser();
        setError('Your session expired. Please sign in again, then save your skills.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Failed to update skills. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return <FormStatus loading="Loading your profile…" />;
  }

  if (!user) {
    return (
      <div className="panel">
        <h1 className="page-title">Account profile</h1>
        <p className="page-lead">Sign in to add or update the skills on your volunteer profile.</p>
        <Link className="btn btn-primary" to="/login" state={{ from: '/volunteer/profile' }}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="page-title">Account profile</h1>
      <p className="page-lead">
        Signed in as <strong>{user.fullName}</strong> ({user.email}). Start from a sample opening or
        pick skills from the catalog — then save for matching.
      </p>

      <form className="panel form-grid" onSubmit={handleSubmit} noValidate>
        <div>
          <span className="field-label">Sample openings</span>
          <p className="field-hint" style={{ marginTop: 0 }}>
            One-click starters using catalog skills. Review the chips, then save.
          </p>
          <div className="sample-openings">
            {SAMPLE_SKILL_OPENINGS.map((opening) => (
              <button
                key={opening.id}
                type="button"
                className="sample-opening"
                disabled={submitting}
                onClick={() => applySampleOpening(opening.skills)}
              >
                <strong>{opening.label}</strong>
                <span>{opening.description}</span>
                <span className="sample-opening-skills">{opening.skills.join(' · ')}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="field-label">My skills</span>
          <SkillPicker selected={skills} onChange={setSkills} disabled={submitting} />
        </div>

        <FormStatus
          error={error}
          success={success}
          loading={submitting ? 'Saving your skills…' : null}
        />

        {error?.includes('sign in') ? (
          <div className="cta-row">
            <Link className="btn btn-primary" to="/login" state={{ from: '/volunteer/profile' }}>
              Sign in again
            </Link>
          </div>
        ) : null}

        <div className="cta-row">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save skills'}
          </button>
        </div>
      </form>

      <DeleteAccountPanel />
    </>
  );
}
