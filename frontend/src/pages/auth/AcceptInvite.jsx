import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../../api/axios";

const AcceptInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Invite token is missing.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await API.post("/auth/verify", {
        token,
        password: form.password,
      });

      setSuccess(response?.data?.msg || "Account activated successfully.");
      setForm({ password: "", confirmPassword: "" });

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (err) {
      setError(err?.response?.data?.msg || "Invalid or expired invite link.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-noise" />

      <div className="auth-grid">
        <section className="auth-brand reveal-item" style={{ "--delay": "0.1s" }}>
          <p className="page-kicker">Team Onboarding</p>
          <h1>Activate Your Invited Account</h1>
          <p>
            Set your password to complete account activation and access the
            immutable audit dashboard.
          </p>

          <div className="auth-stats">
            <article>
              <h3>01</h3>
              <p>Open invite link</p>
            </article>
            <article>
              <h3>02</h3>
              <p>Create secure password</p>
            </article>
            <article>
              <h3>03</h3>
              <p>Sign in and explore</p>
            </article>
          </div>
        </section>

        <section className="auth-card reveal-item" style={{ "--delay": "0.18s" }}>
          <h2>Accept Invitation</h2>
          <p className="auth-helper">
            This link can be used once. Create your password to activate access.
          </p>

          {error ? <p className="inline-error">{error}</p> : null}
          {success ? <p className="inline-success">{success}</p> : null}

          <form onSubmit={handleSubmit} className="auth-form">
            <label htmlFor="password">Create Password</label>
            <input
              id="password"
              type="password"
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={(event) => handleChange("password", event.target.value)}
              autoComplete="new-password"
              required
            />

            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={(event) => handleChange("confirmPassword", event.target.value)}
              autoComplete="new-password"
              required
            />

            <button type="submit" disabled={submitting}>
              {submitting ? "Activating..." : "Activate account"}
            </button>
          </form>

          <p className="auth-footer-copy">
            Already activated? <Link to="/login">Sign in</Link>
          </p>
        </section>
      </div>
    </div>
  );
};

export default AcceptInvite;