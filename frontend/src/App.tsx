import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { CoordinatorLayout } from './pages/coordinator/CoordinatorLayout';
import { CoordinatorDashboard } from './pages/coordinator/Dashboard';
import { CoordinatorNeedsList } from './pages/coordinator/NeedsList';
import { PostNeed } from './pages/coordinator/PostNeed';
import { CoordinatorMatches } from './pages/coordinator/Matches';
import { CoordinatorAccount } from './pages/coordinator/Account';
import { VolunteerLayout } from './pages/volunteer/VolunteerLayout';
import { VolunteerOverview } from './pages/volunteer/Overview';
import { VolunteerNeedsMap } from './pages/volunteer/NeedsMap';
import { ChatAssistant } from './pages/volunteer/ChatAssistant';
import { VolunteerMatches } from './pages/volunteer/Matches';
import { VolunteerProfile } from './pages/volunteer/Profile';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />

        <Route
          path="coordinator"
          element={
            <RequireAuth role="coordinator">
              <CoordinatorLayout />
            </RequireAuth>
          }
        >
          <Route index element={<CoordinatorDashboard />} />
          <Route path="needs" element={<CoordinatorNeedsList />} />
          <Route path="post" element={<PostNeed />} />
          <Route path="matches" element={<CoordinatorMatches />} />
          <Route path="account" element={<CoordinatorAccount />} />
        </Route>

        <Route
          path="volunteer"
          element={
            <RequireAuth role="volunteer">
              <VolunteerLayout />
            </RequireAuth>
          }
        >
          <Route index element={<VolunteerOverview />} />
          <Route path="needs" element={<VolunteerNeedsMap />} />
          <Route path="chat" element={<ChatAssistant />} />
          <Route path="matches" element={<VolunteerMatches />} />
          <Route path="profile" element={<VolunteerProfile />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
