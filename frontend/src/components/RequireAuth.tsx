import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { UserRole } from '../api/client';
import { PageStatus } from './FormStatus';

type Props = {
  role?: UserRole;
  children: React.ReactNode;
};

export function RequireAuth({ role, children }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageStatus loading />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (role && user.role !== role) {
    const home = user.role === 'coordinator' ? '/coordinator' : '/volunteer';
    return (
      <div className="panel">
        <h1 className="page-title">Wrong portal</h1>
        <p className="page-lead">
          You’re signed in as a {user.role}. This area is for {role}s.
        </p>
        <Link className="btn btn-primary" to={home}>
          Go to my portal
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
