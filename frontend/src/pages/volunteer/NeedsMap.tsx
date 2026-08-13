import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  applyToNeed,
  getApplications,
  getOpenNeeds,
  type ApplicationRow,
} from '../../api/client';
import type { Need } from '../../data/mockNeeds';
import { GULF_STATES } from '../../data/states';
import { NeedCard } from '../../components/NeedCard';
import { FormStatus, PageStatus } from '../../components/FormStatus';

export function VolunteerNeedsMap() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [selectedState, setSelectedState] = useState<string>(GULF_STATES[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [needsData, appsData] = await Promise.all([
        getOpenNeeds(),
        getApplications().catch(() => [] as ApplicationRow[]),
      ]);
      setNeeds(needsData);
      setApplications(appsData);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Failed to load needs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredNeeds = useMemo(
    () => needs.filter((need) => (need.state || '') === selectedState),
    [needs, selectedState]
  );

  const countsByState = useMemo(() => {
    const counts = new Map<string, number>();
    for (const state of GULF_STATES) counts.set(state, 0);
    for (const need of needs) {
      if (!need.state) continue;
      counts.set(need.state, (counts.get(need.state) || 0) + 1);
    }
    return counts;
  }, [needs]);

  async function handleApply(need: Need) {
    setApplyingId(need.id);
    setError(null);
    setSuccess(null);
    try {
      const app = await applyToNeed(need.id);
      setApplications((prev) => {
        const others = prev.filter((a) => a.need_id !== need.id);
        return [app, ...others];
      });
      setSuccess(`Applied to “${need.title}” in ${need.state}. Waiting on coordinator approval.`);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Could not apply. Please try again.');
    } finally {
      setApplyingId(null);
    }
  }

  function actionForNeed(need: Need) {
    const status = applications.find((a) => a.need_id === need.id)?.status;
    if (status === 'pending') return { label: 'Pending approval', disabled: true as const };
    if (status === 'approved') return { label: 'Approved', disabled: true as const };
    if (status === 'rejected') {
      return { label: 'Apply again', onAction: () => void handleApply(need) };
    }
    return { label: 'Apply', onAction: () => void handleApply(need) };
  }

  return (
    <>
      <h1 className="page-title">Needs by state</h1>
      <p className="page-lead">
        Choose a Gulf Coast state to see open requirements and the skills they need. Apply to send a
        request to the coordinator for approval.
      </p>

      <FormStatus error={!loading ? error : null} success={success} />

      <section className="panel state-filter-panel">
        <label className="state-filter">
          <span className="field-label">State</span>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            disabled={loading}
            aria-label="Filter needs by state"
          >
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
          Showing requirements in <strong>{selectedState}</strong> — skills listed match each local
          need.
        </p>
      </section>

      <PageStatus
        loading={loading}
        error={loading ? error : null}
        empty={
          !loading && !error && !filteredNeeds.length
            ? `No open needs in ${selectedState} right now. Try another state.`
            : null
        }
      />

      {!loading && !error && filteredNeeds.length ? (
        <div className="need-list">
          {filteredNeeds.map((need) => {
            const action = actionForNeed(need);
            return (
              <NeedCard
                key={need.id}
                need={need}
                actionLabel={action.label}
                onAction={action.onAction}
                actionDisabled={action.disabled}
                actionBusy={applyingId === need.id}
                actionVariant="primary"
              />
            );
          })}
        </div>
      ) : null}
    </>
  );
}
