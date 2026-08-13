import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, createNeed, type MatchRow } from '../../api/client';
import { FormStatus } from '../../components/FormStatus';
import { SkillPicker } from '../../components/SkillPicker';
import { GULF_STATES } from '../../data/states';
import {
  firstError,
  LIMITS,
  validateDescription,
  validateSkillsNeeded,
  validateState,
  validateTitle,
  validateUrgency,
} from '../../lib/validation';

export function PostNeed() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('high');
  const [state, setState] = useState<string>(GULF_STATES[0]);
  const [skillsNeeded, setSkillsNeeded] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [matches, setMatches] = useState<MatchRow[] | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = firstError(
      validateTitle(title),
      validateDescription(description),
      validateUrgency(urgency),
      validateState(state),
      validateSkillsNeeded(skillsNeeded)
    );
    if (validationError) {
      setError(validationError);
      setSuccess(null);
      return;
    }

    setError(null);
    setSuccess(null);
    setSubmitting(true);
    setMatches(null);
    try {
      const created = await createNeed({
        title: title.trim(),
        description: description.trim(),
        urgency,
        state,
        skillsNeeded,
      });
      setMatches(created.matches ?? []);
      setSuccess('Need posted. Embeddings generated and top matches refreshed.');
      setTitle('');
      setDescription('');
      setSkillsNeeded([]);
      setUrgency('high');
      setState(GULF_STATES[0]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to post need. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="page-title">Post a need</h1>
      <p className="page-lead">
        Choose the state and catalog skills for this need. Volunteers can apply from that state
        list; embeddings suggest top fits for your review, then approval puts them in My matches.
      </p>

      <form className="panel form-grid" onSubmit={handleSubmit} noValidate>
        <label>
          Title
          <input
            required
            minLength={LIMITS.title.min}
            maxLength={LIMITS.title.max}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Debris clearing — East End"
            disabled={submitting}
          />
          <span className="field-hint">
            {title.trim().length}/{LIMITS.title.max}
          </span>
        </label>

        <label>
          Description
          <textarea
            required
            minLength={LIMITS.description.min}
            maxLength={LIMITS.description.max}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Multiple downed trees blocking residential streets..."
            disabled={submitting}
          />
          <span className="field-hint">
            {description.trim().length}/{LIMITS.description.max}
          </span>
        </label>

        <div className="form-grid two">
          <label>
            Urgency
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              disabled={submitting}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="moderate">Moderate</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label>
            State
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              disabled={submitting}
              required
            >
              {GULF_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <span className="field-label">Skills needed</span>
          <SkillPicker
            selected={skillsNeeded}
            onChange={setSkillsNeeded}
            disabled={submitting}
          />
        </div>

        <FormStatus
          error={error}
          success={success}
          loading={submitting ? 'Embedding skills and ranking volunteers…' : null}
        />

        <div className="cta-row">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Embedding & matching…' : 'Post need'}
          </button>
        </div>
      </form>

      {matches ? (
        <section className="panel" style={{ marginTop: '1rem' }}>
          <div className="section-head">
            <div>
              <h2>Top matches</h2>
              <p>
                {matches.length
                  ? 'Ranked by embedding similarity with a short plain-language reason.'
                  : 'No volunteer skill embeddings yet — ask volunteers to set their skills.'}
              </p>
            </div>
            <Link className="btn btn-ghost" to="/coordinator/matches">
              All matches
            </Link>
          </div>
          <div className="need-list">
            {matches.map((match) => (
              <article key={match.id} className="need-row">
                <div>
                  <h3>
                    {match.volunteer_name}
                    {match.score != null ? (
                      <span className="chip" style={{ marginLeft: '0.5rem' }}>
                        {Math.round(Number(match.score) * 100)}% similar
                      </span>
                    ) : null}
                  </h3>
                  <p>{match.rationale}</p>
                  {match.volunteer_skills ? (
                    <div className="meta">
                      <span className="chip">{match.volunteer_skills}</span>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
