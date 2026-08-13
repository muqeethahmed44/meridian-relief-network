import { NavLink, Outlet } from 'react-router-dom';

export function CoordinatorLayout() {
  return (
    <div className="portal-layout two-col">
      <aside className="side-nav" aria-label="Coordinator navigation">
        <div className="label">Coordinator</div>
        <NavLink to="/coordinator" end>
          Dashboard
        </NavLink>
        <NavLink to="/coordinator/needs">Open needs</NavLink>
        <NavLink to="/coordinator/post">Post a need</NavLink>
        <NavLink to="/coordinator/matches">Matches & apps</NavLink>
        <NavLink to="/coordinator/account">Account</NavLink>
      </aside>
      <div>
        <Outlet />
      </div>
    </div>
  );
}
