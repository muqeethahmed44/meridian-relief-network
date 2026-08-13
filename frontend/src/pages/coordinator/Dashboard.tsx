import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ApiError,
  getApplications,
  getOpenNeeds,
  type ApplicationRow,
} from '../../api/client';
import type { Need } from '../../data/mockNeeds';
import { NeedCard } from '../../components/NeedCard';
import { PageStatus } from '../../components/FormStatus';

export function CoordinatorDashboard() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void Promise.all([getOpenNeeds(), getApplications().catch(() => [] as ApplicationRow[])])
      .then(([needsData, appsData]) => {
        if (!active) return;
        setNeeds(needsData);
        setApplications(appsData);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Failed to load dashboard.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const critical = needs.filter((n) => n.urgency === 'critical').length;
  const pendingApps = useMemo(
    () => applications.filter((a) => a.status === 'pending'),
    [applications]
  );
  const pendingByNeed = useMemo(() => {
    const map = new Map<string, number>();
    for (const app of pendingApps) {
      map.set(app.need_id, (map.get(app.need_id) || 0) + 1);
    }
    return map;
  }, [pendingApps]);

  const attentionNeeds = useMemo(() => {
    return [...needs]
      .sort((a, b) => {
        const pendingDiff = (pendingByNeed.get(b.id) || 0) - (pendingByNeed.get(a.id) || 0);
        if (pendingDiff !== 0) return pendingDiff;
        const order = { critical: 0, high: 1, moderate: 2, low: 3 } as const;
        return order[a.urgency] - order[b.urgency];
      })
      .slice(0, 3);
  }, [needs, pendingByNeed]);

  return (
    <>
      <h1 className="page-title">Coordinator dashboard</h1>
      <p className="page-lead">
        Post chapter needs by state, review volunteer applications, and approve fits so they appear
        in the volunteer’s My matches.
      </p>

      <div className="stats" style={{ marginBottom: '1.25rem' }}>
        <div className="stat">
          <strong>{loading ? '—' : needs.length}</strong>
          <span>Open needs</span>
        </div>
        <div className="stat">
          <strong>{loading ? '—' : critical}</strong>
          <span>Critical urgency</span>
        </div>
        <div className="stat">
          <strong>{loading ? '—' : pendingApps.length}</strong>
          <span>Pending applications</span>
        </div>
      </div>

      <div className="cta-row" style={{ marginBottom: '1.25rem' }}>
        <Link className="btn btn-primary" to="/coordinator/post">
          Post a need
        </Link>
        <Link className="btn btn-dark" to="/coordinator/matches">
          Review applications
          {pendingApps.length ? ` (${pendingApps.length})` : ''}
        </Link>
        <Link className="btn btn-ghost" to="/coordinator/needs">
          Manage all needs
        </Link>
      </div>

      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Needs needing attention</h2>
            <p>Prioritized by pending applications, then urgency. Approve from Matches & apps.</p>
          </div>
        </div>
        <PageStatus
          loading={loading}
          error={error}
          empty={!loading && !error && !needs.length ? 'No open needs yet. Post one to get started.' : null}
        />
        {!loading && !error ? (
          <div className="need-list">
            {attentionNeeds.map((need) => (
              <NeedCard
                key={need.id}
                need={need}
                pendingApplications={pendingByNeed.get(need.id) || 0}
                actionLabel="Review applications"
                actionTo="/coordinator/matches"
                actionVariant="primary"
              />
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}
