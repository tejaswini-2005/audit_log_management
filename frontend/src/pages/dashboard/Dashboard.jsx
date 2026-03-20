import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../api/axios";
import PortalLayout from "../../components/PortalLayout";
import { useAuth } from "../../context/useAuth";

const formatDateTime = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
};

const shortHash = (hash) => {
  if (!hash || hash.length < 16) return hash || "N/A";
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
};

const DASHBOARD_LOG_LIMIT = 100;

const getLogItems = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const getPaginationMeta = (payload, fallbackTotal = 0) => {
  if (payload?.pagination) {
    return payload.pagination;
  }

  return {
    total: fallbackTotal,
  };
};

function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [myLogs, setMyLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [myPagination, setMyPagination] = useState({ total: 0 });
  const [allPagination, setAllPagination] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [integrityStatus, setIntegrityStatus] = useState({
    integrity: true,
    message: "Chain check pending",
  });

  useEffect(() => {
    let mounted = true;

    const fetchDashboardData = async () => {
      setLoading(true);
      setError("");

      try {
        const settle = (promise) =>
          promise
            .then((v) => ({ ok: true, data: v.data, error: "" }))
            .catch((err) => ({
              ok: false,
              data: null,
              error:
                err?.response?.data?.msg ||
                err?.response?.data?.message ||
                "Failed to load dashboard data",
            }));

        const [myResult, allResult, integrityResult] = await Promise.all([
          settle(API.get("/logs/me", { params: { page: 1, limit: DASHBOARD_LOG_LIMIT } })),
          isAdmin
            ? settle(API.get("/logs/all", { params: { page: 1, limit: DASHBOARD_LOG_LIMIT } }))
            : Promise.resolve({ ok: true, data: { items: [], pagination: { total: 0 } } }),
          isAdmin
            ? settle(API.get("/logs/verify-integrity"))
            : Promise.resolve({ ok: true, data: { integrity: true, message: "Integrity checks are available for admins" } }),
        ]);

        if (!mounted) return;

        if (myResult.ok) {
          const items = getLogItems(myResult.data);
          setMyLogs(items);
          setMyPagination(getPaginationMeta(myResult.data, items.length));
        } else {
          setMyLogs([]);
          setMyPagination({ total: 0 });
          setError(myResult.error || "Unable to load your dashboard logs");
        }

        if (allResult.ok) {
          const items = getLogItems(allResult.data);
          setAllLogs(items);
          setAllPagination(getPaginationMeta(allResult.data, items.length));
        } else if (isAdmin) {
          setAllLogs([]);
          setAllPagination({ total: 0 });
          if (!myResult.ok) {
            setError(
              `${myResult.error || "Unable to load your logs"} | ${allResult.error || "Unable to load organization logs"}`
            );
          } else {
            setError(allResult.error || "Unable to load organization logs");
          }
        }

        if (integrityResult.ok && integrityResult.data) {
          setIntegrityStatus({
            integrity: Boolean(integrityResult.data.integrity),
            message: integrityResult.data.message || "Integrity check complete",
          });
        } else {
          setIntegrityStatus({
            integrity: false,
            message: integrityResult.error || "Could not verify audit chain",
          });
        }
      } catch (err) {
        if (!mounted) return;

        setError(err?.response?.data?.msg || "Session error — please log in again");
        setIntegrityStatus({ integrity: false, message: "Check failed" });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const scopedLogs = useMemo(() => {
    if (isAdmin && allLogs.length > 0) {
      return allLogs;
    }

    return myLogs;
  }, [isAdmin, allLogs, myLogs]);

  const scopedTotal = useMemo(() => {
    if (isAdmin) {
      return allPagination.total || allLogs.length;
    }

    return myPagination.total || myLogs.length;
  }, [isAdmin, allPagination.total, allLogs.length, myPagination.total, myLogs.length]);

  const metrics = useMemo(() => {
    const total = scopedTotal;
    const logins = scopedLogs.filter((log) =>
      String(log.action || "").toUpperCase().includes("LOGIN")
    ).length;

    const todayKey = new Date().toDateString();
    const today = scopedLogs.filter((log) => {
      const date = new Date(log.timestamp);
      return !Number.isNaN(date.getTime()) && date.toDateString() === todayKey;
    }).length;

    const latestAction = scopedLogs[0]?.action || "No activity yet";

    return {
      total,
      logins,
      today,
      latestAction,
    };
  }, [scopedLogs, scopedTotal]);

  const weeklyBars = useMemo(() => {
    const points = [];
    const now = new Date();

    for (let index = 6; index >= 0; index -= 1) {
      const day = new Date(now);
      day.setDate(now.getDate() - index);

      points.push({
        key: day.toISOString().slice(0, 10),
        label: day.toLocaleDateString(undefined, { weekday: "short" }),
        count: 0,
      });
    }

    const map = new Map(points.map((point) => [point.key, point]));

    scopedLogs.forEach((log) => {
      const date = new Date(log.timestamp);
      if (Number.isNaN(date.getTime())) return;

      const key = date.toISOString().slice(0, 10);
      const point = map.get(key);
      if (point) {
        point.count += 1;
      }
    });

    const peak = Math.max(1, ...points.map((point) => point.count));

    return points.map((point) => ({
      ...point,
      height: Math.max(10, Math.round((point.count / peak) * 100)),
    }));
  }, [scopedLogs]);

  const topActions = useMemo(() => {
    const buckets = {};

    scopedLogs.forEach((log) => {
      const key = log.action || "UNKNOWN";
      buckets[key] = (buckets[key] || 0) + 1;
    });

    return Object.entries(buckets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [scopedLogs]);

  const latestLogs = scopedLogs.slice(0, 7);

  return (
    <PortalLayout
      title="Block Explorer"
      subtitle="Operational visibility across auth events, role actions, and immutable chains"
    >
      {error ? <p className="inline-error">{error}</p> : null}

      <section className="stats-grid">
        <article className="metric-card accent-cyan">
          <p>Total Blocks</p>
          <h3>{loading ? "..." : metrics.total}</h3>
          <span>
            {isAdmin ? "Organization scope" : "User scope"}
          </span>
        </article>

        <article className="metric-card accent-indigo">
          <p>Login Events</p>
          <h3>{loading ? "..." : metrics.logins}</h3>
          <span>Sign-ins traced in log chain</span>
        </article>

        <article className="metric-card accent-slate">
          <p>Events Today</p>
          <h3>{loading ? "..." : metrics.today}</h3>
          <span>Live activity in the last 24h</span>
        </article>

        <article className="metric-card accent-emerald">
          <p>Integrity</p>
          <h3>{integrityStatus.integrity ? "Valid" : "Issue"}</h3>
          <span>{integrityStatus.message}</span>
        </article>
      </section>

      <section className="grid-two-col">
        <article className="glass-card">
          <div className="card-head">
            <h3>Blocks Last 7 Days</h3>
            <p>Daily event throughput</p>
          </div>

          <div className="bar-grid">
            {weeklyBars.map((bar) => (
              <div key={bar.key} className="bar-column">
                <div className="bar-track">
                  <span className="bar-fill" style={{ height: `${bar.height}%` }} />
                </div>
                <small>{bar.label}</small>
                <strong>{bar.count}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card">
          <div className="card-head">
            <h3>Action Spectrum</h3>
            <p>Most frequent logged operations</p>
          </div>

          <div className="actions-list">
            {topActions.length === 0 ? (
              <p className="muted-copy">No actions captured yet.</p>
            ) : (
              topActions.map(([action, count]) => (
                <div key={action} className="action-row">
                  <span>{action}</span>
                  <strong>{count}</strong>
                </div>
              ))
            )}
          </div>

          <div className="chip-row">
            <Link className="chip-link" to="/dashboard/my-logs">
              View my logs
            </Link>
            {isAdmin ? (
              <Link className="chip-link" to="/dashboard/all-logs">
                View all logs
              </Link>
            ) : null}
          </div>
        </article>
      </section>

      <section className="glass-card">
        <div className="card-head">
          <div>
            <h3>Latest Blocks</h3>
            <p>Most recent events written to the audit chain</p>
          </div>
          <span className="latest-pill">Last action: {metrics.latestAction}</span>
        </div>

        <div className="table-wrap">
          <table className="log-table">
            <thead>
              <tr>
                <th>Actor</th>
                <th>Action</th>
                <th>Timestamp</th>
                <th>Current Hash</th>
              </tr>
            </thead>
            <tbody>
              {latestLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="table-empty">
                    No audit entries available.
                  </td>
                </tr>
              ) : (
                latestLogs.map((log) => (
                  <tr key={log._id}>
                    <td>{log.userId?.email || user?.email || "system"}</td>
                    <td>{log.action || "UNKNOWN"}</td>
                    <td>{formatDateTime(log.timestamp)}</td>
                    <td>{shortHash(log.currentHash)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </PortalLayout>
  );
}

export default Dashboard;
