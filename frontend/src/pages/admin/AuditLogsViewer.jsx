import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import API from "../../api/axios";
import PortalLayout from "../../components/PortalLayout";
import { useAuth } from "../../context/useAuth";

const AuditLogsViewer = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [integrityStatus, setIntegrityStatus] = useState(null);
  const [checkingIntegrity, setCheckingIntegrity] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  if (user?.role !== "ADMIN") {
    return <Navigate to="/forbidden" replace />;
  }

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const response = await API.get("/logs/all", {
        params: {
          page,
          limit: 20,
          action: actionFilter || undefined,
        },
      });

      const allLogs = Array.isArray(response.data?.items) ? response.data.items : [];
      setLogs(allLogs);
      setFilteredLogs(allLogs);

      if (response.data?.pagination) {
        setTotalPages(response.data.pagination.totalPages || 1);
      }
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to load audit logs",
      });
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    setCheckingIntegrity(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await API.get("/logs/verify-integrity");

      setIntegrityStatus(response.data);

      if (response.data?.integrity) {
        setStatus({
          type: "success",
          message: `Integrity verified! ${response.data.checked || 0} logs checked.`,
        });
      } else {
        setStatus({
          type: "error",
          message: `Integrity check FAILED at sequence ${response.data.failedAtSequence}`,
        });
      }
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to verify integrity",
      });
    } finally {
      setCheckingIntegrity(false);
    }
  };

  const actionsList = [
    "PDF_GENERATED",
    "DOCUMENT_CONVERTED",
    "DOCUMENT_SUBMITTED",
    "DOCUMENT_REVIEWED",
    "DOCUMENT_APPROVED",
    "DOCUMENT_REJECTED",
    "OCR_PROCESSED",
    "CONTENT_EDITED",
    "INVITE_SENT",
    "LOGIN_SUCCESS",
    "LOGIN_FAILED",
  ];

  return (
    <PortalLayout
      title="Audit Logs Viewer"
      subtitle="View and verify audit logs with integrity checking"
    >
      {status.message ? (
        <p className={status.type === "error" ? "inline-error" : "inline-success"}>
          {status.message}
        </p>
      ) : null}

      <section className="stats-grid compact-grid">
        <article className="metric-card accent-cyan">
          <p>Total Logs</p>
          <h3>{logs.length}</h3>
          <span>On this page</span>
        </article>
        <article className="metric-card accent-indigo">
          <p>Page</p>
          <h3>{page}</h3>
          <span>of {totalPages}</span>
        </article>
        <article className="metric-card accent-emerald">
          <p>Integrity</p>
          <h3>{integrityStatus?.integrity ? "✓" : "✗"}</h3>
          <span>Status: {integrityStatus ? (integrityStatus.integrity ? "Valid" : "Failed") : "Not checked"}</span>
        </article>
      </section>

      <section className="grid-two-col">
        <article className="glass-card">
          <div className="card-head">
            <h3>Filter & Verify</h3>
            <p>Filter logs and verify audit chain integrity</p>
          </div>

          <form className="stack-form">
            <label htmlFor="action-filter">Action Type</label>
            <select
              id="action-filter"
              value={actionFilter}
              onChange={(event) => {
                setActionFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All Actions</option>
              {actionsList.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleVerifyIntegrity}
              disabled={checkingIntegrity}
              className="btn-success"
            >
              {checkingIntegrity ? "Verifying..." : "Verify Integrity"}
            </button>

            {integrityStatus && (
              <div className="status-box">
                <p><strong>Status:</strong> {integrityStatus.integrity ? "✓ Valid" : "✗ Failed"}</p>
                <p><strong>Message:</strong> {integrityStatus.message}</p>
                <p><strong>Logs Checked:</strong> {integrityStatus.checked || 0}</p>
              </div>
            )}
          </form>
        </article>

        <article className="glass-card">
          <div className="card-head">
            <h3>Pagination</h3>
            <p>Navigate through audit logs</p>
          </div>

          <div className="stack-form">
            <p>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </p>

            <div className="grid-two-col">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1 || loadingLogs}
                className="btn-secondary"
              >
                ← Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || loadingLogs}
                className="btn-secondary"
              >
                Next →
              </button>
            </div>
          </div>
        </article>
      </section>

      <section className="glass-card">
        <div className="card-head">
          <h3>Audit Logs</h3>
          <p>{actionFilter ? `Filtered by: ${actionFilter}` : "All actions"}</p>
        </div>

        <div className="timeline-list">
          {loadingLogs ? (
            <article>
              <span>⏳</span>
              <p>Loading logs...</p>
            </article>
          ) : filteredLogs.length === 0 ? (
            <article>
              <span>—</span>
              <p>No logs found</p>
            </article>
          ) : (
            filteredLogs.map((log) => (
              <article key={log._id}>
                <span>{log.action?.charAt(0) || "?"}</span>
                <div>
                  <p>
                    <strong>{log.action}</strong> by {log.userId?.email || "System"}
                  </p>
                  <p className="muted-copy">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                  <p className="muted-copy">
                    Seq: {log.sequence || "—"} | Hash: {log.currentHash?.substring(0, 16)}...
                  </p>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </PortalLayout>
  );
};

export default AuditLogsViewer;
