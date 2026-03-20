import { useState } from "react";
import API from "../../api/axios";
import PortalLayout from "../../components/PortalLayout";

const InviteUser = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "USER",
  });
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({
    type: "",
    message: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });
    setSending(true);

    try {
      await API.post("/admin/invite", form);
      setStatus({
        type: "success",
        message: `Invite sent to ${form.email}`,
      });
      setForm({ name: "", email: "", role: "USER" });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to send invitation",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <PortalLayout
      title="Invite User"
      subtitle="Secure onboarding via role-based invitation links"
    >
      {status.message ? (
        <p className={status.type === "error" ? "inline-error" : "inline-success"}>
          {status.message}
        </p>
      ) : null}

      <div className="grid-two-col invite-grid">
        <section className="glass-card">
          <div className="card-head">
            <h3>New Team Invite</h3>
            <p>Generate a verification link for first-time access</p>
          </div>

          <form onSubmit={handleSubmit} className="stack-form">
            <label htmlFor="invite-name">Full Name</label>
            <input
              id="invite-name"
              placeholder="Jane Cooper"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <label htmlFor="invite-email">Work Email</label>
            <input
              id="invite-email"
              type="email"
              placeholder="jane@company.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <label htmlFor="invite-role">Role</label>
            <select
              id="invite-role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>

            <button type="submit" disabled={sending}>
              {sending ? "Sending invite..." : "Send invite"}
            </button>
          </form>
        </section>

        <aside className="glass-card invite-note">
          <div className="card-head">
            <h3>Invite Flow</h3>
            <p>What happens after sending the request</p>
          </div>

          <div className="timeline-list">
            <article>
              <span>01</span>
              <p>User receives verification link by email.</p>
            </article>
            <article>
              <span>02</span>
              <p>User creates password and activates account.</p>
            </article>
            <article>
              <span>03</span>
              <p>First login action is recorded in immutable logs.</p>
            </article>
          </div>
        </aside>
      </div>
    </PortalLayout>
  );
};

export default InviteUser;