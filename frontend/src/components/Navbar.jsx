import { useAuth } from "../context/useAuth";
import { Link } from "react-router-dom";

const Navbar = () => {
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <nav className="navbar">
      <div className="nav-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/dashboard/content">Content Editor</Link>
        <Link to="/dashboard/submission">Submission</Link>
        <Link to="/dashboard/projects">Projects</Link>
        <Link to="/dashboard/my-logs">My Logs</Link>
        
        {user?.role === "ADMIN" && (
          <>
            <Link to="/dashboard/submission-review">Review Submissions</Link>
            <Link to="/dashboard/audit-logs">Audit Logs</Link>
            <Link to="/dashboard/all-logs">All Logs</Link>
            <Link to="/dashboard/invite-user">Invite User</Link>
            <Link to="/dashboard/project-research">Research</Link>
          </>
        )}
      </div>
      <button onClick={handleLogout} className="btn-logout">Logout</button>
    </nav>
  );
};

export default Navbar;