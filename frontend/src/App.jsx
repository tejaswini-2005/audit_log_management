import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";

import Login from "./pages/auth/Login";
import AcceptInvite from "./pages/auth/AcceptInvite";
import Dashboard from "./pages/dashboard/Dashboard";
import InviteUser from "./pages/admin/InviteUser";
import AllLogs from "./pages/admin/AllLogs";
import MyLogs from "./pages/user/MyLogs";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";

const Forbidden = () => (
  <section className="status-page">
    <p className="page-kicker">Restricted Area</p>
    <h1>403</h1>
    <p className="status-copy">
      Your account does not have permission to open this module.
    </p>
    <Link className="status-link" to="/dashboard">
      Return to dashboard
    </Link>
  </section>
);

const NotFound = () => (
  <section className="status-page">
    <p className="page-kicker">Route Missing</p>
    <h1>404</h1>
    <p className="status-copy">
      The page you requested is not available in this environment.
    </p>
    <Link className="status-link" to="/dashboard">
      Open dashboard
    </Link>
  </section>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invite/:token" element={<AcceptInvite />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/my-logs" element={<MyLogs />} />

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<Navigate to="/dashboard/all-logs" replace />} />
            <Route path="/dashboard/invite-user" element={<InviteUser />} />
            <Route path="/dashboard/all-logs" element={<AllLogs />} />
          </Route>
        </Route>

        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;