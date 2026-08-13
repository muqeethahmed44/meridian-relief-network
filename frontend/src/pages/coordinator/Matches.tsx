import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  getApplications,
  getMatches,
  updateApplicationStatus,
  type ApplicationRow,
  type MatchRow,
} from '../../api/client';
import { GULF_STATES } from '../../data/states';
import { alignedSkills } from '../../lib/skillOverlap';
import { FormStatus, PageStatus } from '../../components/FormStatus';

export function CoordinatorMatches() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [selectedState, setSelectedState] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [matchData, appData] = await Promise.all([getMatches(), getApplications()]);
      setMatches(matchData);
      setApplications(appData);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Failed to load matches.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo(() => {
    return applications.filter((a) => {
      if (a.status !== 'pending') return false;
      if (selectedState === 'all') return true;
      return a.need_state === selectedState;
    });
  }, [applications, selectedState]);

  const approved = useMemo(() => {
    return applications.filter((a) => {
      if (a.status !== 'approved') return false;
      if (selectedState === 'all') return true;
      return a.need_state === selectedState;
    });
  }, [applications, selectedState]);

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      {
        title: string;
        urgency?: string;
        skills?: string;
        state?: string | null;
        rows: MatchRow[];
      }
    >();
    for (const row of matches) {
      if (selectedState !== 'all' && row.need_state !== selectedState) continue;
      const existing = map.get(row.need_id);
      if (existing) {
        existing.rows.push(row);
      } else {
        map.set(row.need_id, {
          title: row.need_title || 'Need',
          urgency: row.urgency,
          skills: row.skills_needed,
          state: row.need_state,
          rows: [row],
        });
      }
    }
    return [...map.entries()];
  }, [matches, selectedState]);

  async function handleDecision(app: ApplicationRow, status: 'approved' | 'rejected') {
    setActingId(app.id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateApplicationStatus(app.id, status);
      setApplications((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setSuccess(
        status === 'approved'
          ? `Approved ${app.volunteer_name} for “${app.need_title}” (${app.need_state || 'state n/a'}). It now appears in their My matches.`
          : `Rejected ${app.volunteer_name}'s application for “${app.need_title}”.`
      );
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Failed to update application.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <>
      <h1 className="page-title">Matches & applications</h1>
      <p className="page-lead">
        Approve volunteer applications so they show under My matches. Suggested skill rankings below
        are reference only — they do not place a volunteer until you approve.
      </p>

      <section className="panel state-filter-panel" style={{ marginBottom: '1.25rem' }}>
        <label className="state-filter">
          <span className="field-label">Filter by state</span>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            disabled={loading}
            aria-label="Filter applications by state"
          >
            <option value="all">All states</option>
            {GULF_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>
        <p className="state-filter-note">
          Syncs with volunteer “By state” browsing — review applications for the same locations.
        </p>
      </section>

      <FormStatus error={!loading ? error : null} success={success} />

      <section className="panel" style={{ marginBottom: '1.25rem' }}>
        <div className="section-head">
          <div>
            <h2>Pending applications</h2>
            <p>Volunteers who applied from Overview or By state.</p>
          </div>
          <button
            type="button"
            className="btn btn-dark"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        <PageStatus
          loading={loading}
          error={null}
          empty={
            !loading && !pending.length
              ? selectedState === 'all'
                ? 'No pending applications right now.'
                : `No pending applications in ${selectedState}.`
              : null
          }
        />
        {!loading ? (
          <div className="need-list">
            {pending.map((app) => {
              const overlap = alignedSkills(app.volunteer_skills, app.skills_needed);
              return (
                <article key={app.id} className="need-row">
                  <div>
                    <h3>
                      {app.volunteer_name}
                      <span className="chip" style={{ marginLeft: '0.5rem' }}>
                        Pending
                      </span>
                    </h3>
                    <p>
                      Applied to <strong>{app.need_title}</strong>
                    </p>
                    <div className="meta">
                      {app.need_state ? (
                        <span className="chip state">{app.need_state}</span>
                      ) : null}
                      {app.urgency ? (
                        <span className={`chip ${app.urgency}`}>{app.urgency}</span>
                      ) : null}
                      {app.skills_needed ? (
                        <span className="chip">Need: {app.skills_needed}</span>
                      ) : null}
                    </div>
                    {overlap.length ? (
                      <div className="meta" style={{ marginTop: '0.45rem' }}>
                        <span className="chip aligned">Aligned: {overlap.join(' · ')}</span>
                      </div>
                    ) : (
                      <p className="muted">No catalog skill overlap yet — check their profile skills.</p>
                    )}
                    {app.volunteer_skills ? (
                      <div className="meta" style={{ marginTop: '0.35rem' }}>
                        <span className="chip">Volunteer: {app.volunteer_skills}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="need-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={actingId === app.id}
                      onClick={() => void handleDecision(app, 'approved')}
                    >
                      {actingId === app.id ? 'Saving…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={actingId === app.id}
                      onClick={() => void handleDecision(app, 'rejected')}
                    >
                      Reject
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="panel" style={{ marginBottom: '1.25rem' }}>
        <div className="section-head">
          <div>
            <h2>Approved placements</h2>
            <p>These already appear in the volunteer’s My matches.</p>
          </div>
        </div>
        <PageStatus
          loading={false}
          error={null}
          empty={
            !loading && !approved.length
              ? 'No approved placements yet for this filter.'
              : null
          }
        />
        <div className="need-list">
          {approved.map((app) => (
            <article key={app.id} className="need-row">
              <div>
                <h3>
                  {app.volunteer_name}
                  <span className="chip" style={{ marginLeft: '0.5rem' }}>
                    Approved
                  </span>
                </h3>
                <p>
                  <strong>{app.need_title}</strong>
                </p>
                <div className="meta">
                  {app.need_state ? <span className="chip state">{app.need_state}</span> : null}
                  {app.urgency ? <span className={`chip ${app.urgency}`}>{app.urgency}</span> : null}
                  {app.skills_needed ? <span className="chip">{app.skills_needed}</span> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="section-head">
        <div>
          <h2>Suggested skill rankings</h2>
          <p>Top 3 volunteers per need by embedding similarity — reference only, not placements.</p>
        </div>
      </div>

      <PageStatus
        loading={loading}
        error={loading ? error : null}
        empty={
          !loading && !error && !grouped.length
            ? 'No suggested rankings yet. Post a need and make sure volunteers have skills saved.'
            : null
        }
      />

      <div className="need-list">
        {grouped.map(([needId, group]) => (
          <section key={needId} className="panel">
            <div className="section-head">
              <div>
                <h2>{group.title}</h2>
                <p>{group.skills}</p>
              </div>
              <div className="meta">
                {group.state ? <span className="chip state">{group.state}</span> : null}
                {group.urgency ? (
                  <span className={`chip ${group.urgency}`}>{group.urgency}</span>
                ) : null}
              </div>
            </div>
            <div className="need-list">
              {group.rows.map((match, index) => {
                const overlap = alignedSkills(match.volunteer_skills, match.skills_needed);
                return (
                  <article key={match.id} className="need-row">
                    <div>
                      <h3>
                        #{index + 1} {match.volunteer_name}
                        {match.score != null ? (
                          <span className="chip" style={{ marginLeft: '0.5rem' }}>
                            {Math.round(Number(match.score) * 100)}% similar
                          </span>
                        ) : null}
                      </h3>
                      <p>{match.rationale}</p>
                      {overlap.length ? (
                        <div className="meta">
                          <span className="chip aligned">Aligned: {overlap.join(' · ')}</span>
                        </div>
                      ) : null}
                      {match.volunteer_skills ? (
                        <div className="meta">
                          <span className="chip">{match.volunteer_skills}</span>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
