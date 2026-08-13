import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Home() {
  const { user, loading } = useAuth();

  const primaryTo = user
    ? user.role === 'volunteer'
      ? '/volunteer'
      : '/coordinator'
    : '/register';
  const primaryLabel = user
    ? user.role === 'volunteer'
      ? 'Go to volunteer portal'
      : 'Go to coordinator portal'
    : 'Create an account';

  const secondaryTo = user ? (user.role === 'volunteer' ? '/volunteer/profile' : '/coordinator/post') : '/login';
  const secondaryLabel = user
    ? user.role === 'volunteer'
      ? 'Update my skills'
      : 'Post a need'
    : 'Sign in';

  return (
    <>
      <section className="hero" aria-label="Meridian Relief Network">
        <h1>Meridian Relief Network</h1>
        <p>
          When the next storm hits, connect Gulf Coast volunteers to the right urgent need —
          by skill, state, and urgency — not by phone trees and spreadsheets.
        </p>
        <div className="cta-row">
          <Link className="btn btn-primary" to={loading ? '/register' : primaryTo}>
            {loading ? 'Loading…' : primaryLabel}
          </Link>
          <Link className="btn btn-secondary" to={loading ? '/login' : secondaryTo}>
            {loading ? '…' : secondaryLabel}
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2>Two portals, one mission</h2>
            <p>
              Coordinators post needs by state. Volunteers apply, coordinators approve, and
              approved fits land in My matches — with skill rankings as a decision aid.
            </p>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <strong>Coordinator</strong>
            <span>Post and manage urgent volunteer needs under time pressure</span>
          </div>
          <div className="stat">
            <strong>Volunteer</strong>
            <span>Browse by state, apply, and track approved My matches</span>
          </div>
          <div className="stat">
            <strong>Matching</strong>
            <span>Catalog skills + embeddings help coordinators approve the right fits</span>
          </div>
        </div>
      </section>
    </>
  );
}
