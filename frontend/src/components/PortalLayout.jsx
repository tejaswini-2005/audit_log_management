import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const primaryLinks = [
  {
    to: "/dashboard",
    label: "Block Explorer",
    helper: "Real-time overview",
  },
  {
    to: "/dashboard/my-logs",
    label: "My Activity",
    helper: "Personal audit stream",
  },
];

const adminLinks = [
  {
    to: "/dashboard/all-logs",
    label: "All Logs",
    helper: "Org-wide events",
  },
  {
    to: "/dashboard/invite-user",
    label: "Invite User",
    helper: "Role-based onboarding",
  },
];

const buildNavClass = ({ isActive }) =>
  isActive ? "side-nav-link is-active" : "side-nav-link";

const PortalLayout = ({ title, subtitle, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initial = (user?.name || user?.email || "U")
    .charAt(0)
    .toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="portal-bg">
      <div className="ambient-glow ambient-left" />
      <div className="ambient-glow ambient-right" />

      <div className="portal-layout">
        <aside className="portal-sidebar reveal-item" style={{ "--delay": "0.08s" }}>
          <div className="brand-wrap">
            <div className="brand-mark">K</div>
            <div>
              <p className="brand-eyebrow">Secure Audit Chain</p>
              <h1 className="brand-title">kaleido</h1>
            </div>
          </div>

          <p className="nav-section-label">Navigation</p>

          <nav className="side-nav">
            {primaryLinks.map((item) => (
              <NavLink key={item.to} to={item.to} className={buildNavClass}>
                <span className="link-title">{item.label}</span>
                <span className="link-helper">{item.helper}</span>
              </NavLink>
            ))}

            {user?.role === "ADMIN" && (
              <>
                <p className="nav-section-label secondary">Admin</p>
                {adminLinks.map((item) => (
                  <NavLink key={item.to} to={item.to} className={buildNavClass}>
                    <span className="link-title">{item.label}</span>
                    <span className="link-helper">{item.helper}</span>
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          <button type="button" className="logout-btn" onClick={handleLogout}>
            Sign out
          </button>
        </aside>

        <section className="portal-main">
          <header className="portal-topbar reveal-item" style={{ "--delay": "0.16s" }}>
            <div>
              <p className="page-kicker">Ops Dashboard</p>
              <h2 className="page-title">{title}</h2>
              {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
            </div>

            <div className="user-chip">
              <div className="user-avatar">{initial}</div>
              <div>
                <p className="user-name">{user?.name || "Account User"}</p>
                <p className="user-meta">{user?.email || "No email"}</p>
              </div>
              <span
                className={
                  user?.role === "ADMIN"
                    ? "role-tag role-admin"
                    : "role-tag role-user"
                }
              >
                {user?.role || "USER"}
              </span>
            </div>
          </header>

          <main className="portal-panel reveal-item" style={{ "--delay": "0.24s" }}>
            {children}
          </main>
        </section>
      </div>
    </div>
  );
};

export default PortalLayout;
