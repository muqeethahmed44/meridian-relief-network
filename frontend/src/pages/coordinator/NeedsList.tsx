import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ApiError,
  getApplications,
  getOpenNeeds,
  type ApplicationRow,
} from '../../api/client';
import type { Need } from '../../data/mockNeeds';
import { GULF_STATES } from '../../data/states';
import { NeedCard } from '../../components/NeedCard';
import { PageStatus } from '../../components/FormStatus';

export function CoordinatorNeedsList() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [selectedState, setSelectedState] = useState<string>('all');
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
          setError(err instanceof ApiError ? err.message : 'Failed to load needs.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const pendingByNeed = useMemo(() => {
    const map = new Map<string, number>();
    for (const app of applications) {
      if (app.status !== 'pending') continue;
      map.set(app.need_id, (map.get(app.need_id) || 0) + 1);
    }
    return map;
  }, [applications]);

  const countsByState = useMemo(() => {
    const counts = new Map<string, number>();
    for (const state of GULF_STATES) counts.set(state, 0);
    for (const need of needs) {
      if (!need.state) continue;
      counts.set(need.state, (counts.get(need.state) || 0) + 1);
    }
    return counts;
  }, [needs]);

  const filteredNeeds = useMemo(() => {
    if (selectedState === 'all') return needs;
    return needs.filter((need) => need.state === selectedState);
  }, [needs, selectedState]);

  return (
    <>
      <h1 className="page-title">Open needs</h1>
      <p className="page-lead">
        Manage posted requests by Gulf Coast state. Volunteers apply from their portal; approve them
        under Matches & apps so they appear in My matches.
      </p>

      <div className="cta-row" style={{ marginBottom: '1rem' }}>
        <Link className="btn btn-primary" to="/coordinator/post">
          Post a need
        </Link>
        <Link className="btn btn-dark" to="/coordinator/matches">
          Review applications
        </Link>
      </div>

      <section className="panel state-filter-panel">
        <label className="state-filter">
          <span className="field-label">Filter by state</span>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            disabled={loading}
            aria-label="Filter needs by state"
          >
            <option value="all">All states ({needs.length} open)</option>
            {GULF_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
                {countsByState.get(state)
                  ? ` (${countsByState.get(state)} open)`
                  : ' (none open)'}
              </option>
            ))}
          </select>
        </label>
        <p className="state-filter-note">
          Same state list volunteers use — keep skills and location aligned when you post.
        </p>
      </section>

      <PageStatus
        loading={loading}
        error={error}
        empty={
          !loading && !error && !filteredNeeds.length
            ? selectedState === 'all'
              ? 'No open needs yet.'
              : `No open needs in ${selectedState}.`
            : null
        }
      />

      {!loading && !error ? (
        <div className="need-list">
          {filteredNeeds.map((need) => (
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
    </>
  );
}
