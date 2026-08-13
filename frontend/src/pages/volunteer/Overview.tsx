import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  applyToNeed,
  getApplications,
  getOpenNeeds,
  type ApplicationRow,
} from '../../api/client';
import type { Need } from '../../data/mockNeeds';
import { NeedCard } from '../../components/NeedCard';
import { FormStatus, PageStatus } from '../../components/FormStatus';

export function VolunteerOverview() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
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

  function statusForNeed(needId: string): ApplicationRow['status'] | null {
    return applications.find((a) => a.need_id === needId)?.status ?? null;
  }

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
      setSuccess(
        `Applied to “${need.title}”. A coordinator will review it — approved fits show under My matches.`
      );
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : 'Could not apply. Please try again.');
    } finally {
      setApplyingId(null);
    }
  }

  function actionForNeed(need: Need): {
    label: string;
    disabled?: boolean;
    onAction?: () => void;
  } {
    const status = statusForNeed(need.id);
    if (status === 'pending') {
      return { label: 'Pending approval', disabled: true };
    }
    if (status === 'approved') {
      return { label: 'Approved', disabled: true };
    }
    if (status === 'rejected') {
      return {
        label: 'Apply again',
        onAction: () => void handleApply(need),
      };
    }
    return {
      label: 'Apply',
      onAction: () => void handleApply(need),
    };
  }

  return (
    <>
      <h1 className="page-title">Volunteer overview</h1>
      <p className="page-lead">
        See open chapter needs across the Gulf Coast and apply where you can help. Coordinators
        approve requests before they appear in My matches.
      </p>

      <div className="cta-row" style={{ marginBottom: '1.25rem' }}>
        <Link className="btn btn-primary" to="/volunteer/needs">
          Browse by state
        </Link>
        <Link className="btn btn-ghost" to="/volunteer/chat">
          Ask the assistant
        </Link>
        <Link className="btn btn-ghost" to="/volunteer/profile">
          Update my skills
        </Link>
      </div>

      <FormStatus error={!loading ? error : null} success={success} />

      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Urgent open needs</h2>
            <p>Apply to send a request to the coordinator console for approval.</p>
          </div>
        </div>
        <PageStatus
          loading={loading}
          error={loading ? error : null}
          empty={!loading && !error && !needs.length ? 'No open needs right now.' : null}
        />
        {!loading && !error ? (
          <div className="need-list">
            {needs.slice(0, 3).map((need) => {
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
      </section>
    </>
  );
}
