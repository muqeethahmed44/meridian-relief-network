import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ApiError,
  getApplications,
  type ApplicationRow,
} from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { FormStatus, PageStatus } from '../../components/FormStatus';

export function VolunteerMatches() {
  const { user } = useAuth();
  const [approved, setApproved] = useState<ApplicationRow[]>([]);
  const [pending, setPending] = useState<ApplicationRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMatches = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const apps = await getApplications();
      setApproved(apps.filter((a) => a.status === 'approved'));
      setPending(apps.filter((a) => a.status === 'pending'));
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Failed to load matches.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    setSuccess(null);
    try {
      const apps = await getApplications();
      const nextApproved = apps.filter((a) => a.status === 'approved');
      const nextPending = apps.filter((a) => a.status === 'pending');
      setApproved(nextApproved);
      setPending(nextPending);
      setSuccess(
        nextApproved.length
          ? `Updated — ${nextApproved.length} approved match${nextApproved.length === 1 ? '' : 'es'}.`
          : nextPending.length
            ? 'Updated — still waiting on coordinator approval for your applications.'
            : 'Updated — no approved matches yet. Apply from Overview first.'
      );
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Failed to refresh matches.');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <div className="section-head">
        <div>
          <h1 className="page-title">My matches</h1>
          <p className="page-lead">
            Needs a coordinator has approved you for. Apply from Overview, then refresh after
            approval.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-dark"
          onClick={() => void handleRefresh()}
          disabled={refreshing || loading || !user}
        >
          {refreshing ? 'Refreshing…' : 'Refresh matches'}
        </button>
      </div>

      <FormStatus error={error && !loading ? error : null} success={success} />

      <PageStatus
        loading={loading}
        error={loading ? error : null}
        empty={
          !loading && !error && !approved.length
            ? 'No approved matches yet. Apply from Overview, then use Refresh matches after a coordinator approves you.'
            : null
        }
      />

      <div className="need-list">
        {approved.map((app) => (
          <article key={app.id} className="need-row">
            <div>
              <h3>
                {app.need_title}
                <span className="chip" style={{ marginLeft: '0.5rem' }}>
                  Approved
                </span>
              </h3>
              {app.need_description ? <p>{app.need_description}</p> : null}
              <div className="meta">
                {app.need_state ? <span className="chip state">{app.need_state}</span> : null}
                {app.urgency ? <span className={`chip ${app.urgency}`}>{app.urgency}</span> : null}
                {app.skills_needed ? <span className="chip">{app.skills_needed}</span> : null}
              </div>
            </div>
          </article>
        ))}
      </div>

      {!loading && pending.length ? (
        <section className="panel" style={{ marginTop: '1.25rem' }}>
          <div className="section-head">
            <div>
              <h2>Pending applications</h2>
              <p>Waiting on coordinator review.</p>
            </div>
            <Link className="btn btn-ghost" to="/volunteer">
              Back to overview
            </Link>
          </div>
          <div className="need-list">
            {pending.map((app) => (
              <article key={app.id} className="need-row">
                <div>
                  <h3>
                    {app.need_title}
                    <span className="chip" style={{ marginLeft: '0.5rem' }}>
                      Pending
                    </span>
                  </h3>
                  <div className="meta">
                    {app.need_state ? <span className="chip state">{app.need_state}</span> : null}
                    {app.urgency ? (
                      <span className={`chip ${app.urgency}`}>{app.urgency}</span>
                    ) : null}
                    {app.skills_needed ? <span className="chip">{app.skills_needed}</span> : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
