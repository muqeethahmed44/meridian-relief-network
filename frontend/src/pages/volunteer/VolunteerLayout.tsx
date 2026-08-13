import { NavLink, Outlet } from 'react-router-dom';

export function VolunteerLayout() {
  return (
    <div className="portal-layout two-col">
      <aside className="side-nav" aria-label="Volunteer navigation">
        <div className="label">Volunteer</div>
        <NavLink to="/volunteer" end>
          Overview
        </NavLink>
        <NavLink to="/volunteer/needs">By state</NavLink>
        <NavLink to="/volunteer/chat">Ask where I fit</NavLink>
        <NavLink to="/volunteer/matches">My matches</NavLink>
        <NavLink to="/volunteer/profile">Account</NavLink>
      </aside>
      <div>
        <Outlet />
      </div>
    </div>
  );
}
