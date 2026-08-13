import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { DeleteAccountPanel } from './DeleteAccountPanel';
import { FormStatus } from './FormStatus';

export function Layout() {
  const { user, loading, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const profilePath =
    user?.role === 'coordinator' ? '/coordinator/account' : '/volunteer/profile';

  useEffect(() => {
    if (!userMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
        setDeleteOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userMenuOpen]);

  async function handleLogout() {
    setLogoutError(null);
    setLoggingOut(true);
    setUserMenuOpen(false);
    try {
      await logout();
      setMenuOpen(false);
    } catch {
      setLogoutError('Could not sign out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink to="/" className="brand" end onClick={() => setMenuOpen(false)}>
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-text">
            <strong>Meridian Relief Network</strong>
            <span>Gulf Coast disaster response</span>
          </span>
        </NavLink>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={menuOpen}
          aria-controls="primary-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? 'Close' : 'Menu'}
        </button>

        <nav
          id="primary-nav"
          className={`nav-links ${menuOpen ? 'open' : ''}`}
          aria-label="Primary"
        >
          <NavLink to="/" end onClick={() => setMenuOpen(false)}>
            Home
          </NavLink>
          {!loading && user?.role === 'coordinator' ? (
            <NavLink to="/coordinator" onClick={() => setMenuOpen(false)}>
              Coordinator
            </NavLink>
          ) : null}
          {!loading && user?.role === 'volunteer' ? (
            <NavLink to="/volunteer" onClick={() => setMenuOpen(false)}>
              Volunteer
            </NavLink>
          ) : null}
          {!loading && !user ? (
            <>
              <NavLink to="/login" onClick={() => setMenuOpen(false)}>
                Sign in
              </NavLink>
              <NavLink to="/register" onClick={() => setMenuOpen(false)}>
                Register
              </NavLink>
            </>
          ) : null}
          {!loading && user ? (
            <div className="portal-pill" ref={userMenuRef}>
              <button
                type="button"
                className="user-menu-trigger"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                onClick={() => setUserMenuOpen((open) => !open)}
              >
                <span className="portal-pill-text">
                  {user.fullName} · {user.role}
                </span>
                <span className="chevron" aria-hidden="true">
                  ▾
                </span>
              </button>

              {userMenuOpen ? (
                <div className="user-menu" role="menu">
                  <Link
                    role="menuitem"
                    to={profilePath}
                    onClick={() => {
                      setUserMenuOpen(false);
                      setMenuOpen(false);
                    }}
                  >
                    Account profile
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    className="user-menu-danger"
                    onClick={() => {
                      setUserMenuOpen(false);
                      setDeleteOpen(true);
                    }}
                  >
                    Delete account
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                className="linkish"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
              >
                {loggingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          ) : null}
        </nav>
      </header>

      {logoutError ? (
        <div className="banner-error">
          <FormStatus error={logoutError} />
        </div>
      ) : null}

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        Meridian Relief Network — matching skilled volunteers to urgent chapter needs
      </footer>

      {deleteOpen ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setDeleteOpen(false);
          }}
        >
          <div
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
          >
            <DeleteAccountPanel variant="modal" onClose={() => setDeleteOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
