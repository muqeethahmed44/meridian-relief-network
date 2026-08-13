import { Link } from 'react-router-dom';
import type { Need } from '../data/mockNeeds';

type Props = {
  need: Need;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionBusy?: boolean;
  actionVariant?: 'ghost' | 'primary' | 'dark';
  pendingApplications?: number;
};

export function NeedCard({
  need,
  actionLabel,
  actionTo,
  onAction,
  actionDisabled,
  actionBusy,
  actionVariant = 'ghost',
  pendingApplications,
}: Props) {
  const btnClass =
    actionVariant === 'primary'
      ? 'btn btn-primary'
      : actionVariant === 'dark'
        ? 'btn btn-dark'
        : 'btn btn-ghost';

  return (
    <article className="need-row">
      <div>
        <h3>
          {need.title}
          {pendingApplications && pendingApplications > 0 ? (
            <span className="chip pending-apps" style={{ marginLeft: '0.5rem' }}>
              {pendingApplications} pending
            </span>
          ) : null}
        </h3>
        <p>{need.description}</p>
        <div className="meta">
          {need.state ? <span className="chip state">{need.state}</span> : null}
          <span className={`chip ${need.urgency}`}>{need.urgency}</span>
          <span className="chip">{need.skills_needed}</span>
          {need.posted_by_name ? (
            <span className="chip">Posted by {need.posted_by_name}</span>
          ) : null}
        </div>
      </div>
      {actionLabel ? (
        <div className="need-actions">
          {actionTo && !onAction ? (
            <Link className={btnClass} to={actionTo}>
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              className={btnClass}
              onClick={onAction}
              disabled={actionDisabled || actionBusy || !onAction}
            >
              {actionBusy ? 'Applying…' : actionLabel}
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}
