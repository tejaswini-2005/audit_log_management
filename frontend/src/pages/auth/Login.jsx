import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

const Login = () => {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(form);
      navigate("/dashboard");
    } catch (err) {
      const validationMessage = err?.response?.data?.errors?.[0]?.message;
      const networkMessage = !err?.response
        ? "Unable to reach server. Check backend status and API URL/CORS settings."
        : "";
      setError(
        validationMessage ||
          err?.response?.data?.msg ||
          networkMessage ||
          "Login failed. Check your credentials."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="auth-page">
      <div className="auth-noise" />

      <div className="auth-grid">
        <section className="auth-brand reveal-item" style={{ "--delay": "0.1s" }}>
          <p className="page-kicker">Immutable Ledger Access</p>
          <h1>kaleido Security Console</h1>
          <p>
            Monitor authentication events, team activity, and chain integrity in
            one focused command center.
          </p>

          <div className="auth-stats">
            <article>
              <h3>100%</h3>
              <p>Audit trail immutability</p>
            </article>
            <article>
              <h3>24/7</h3>
              <p>Real-time activity review</p>
            </article>
            <article>
              <h3>RBAC</h3>
              <p>Role-based access controls</p>
            </article>
          </div>
        </section>

        <section className="auth-card reveal-item" style={{ "--delay": "0.18s" }}>
          <h2>Sign in to continue</h2>
          <p className="auth-helper">
            Use your invited account details to access dashboards and logs.
          </p>

          {error ? <p className="inline-error">{error}</p> : null}

          <form onSubmit={handleSubmit} className="auth-form">
            <label htmlFor="email">Work Email</label>
            <input
              id="email"
              type="email"
              placeholder="admin@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
            />

            <button type="submit" disabled={submitting || loading}>
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Login;