import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../../api/axios";
import PortalLayout from "../../components/PortalLayout";

const formatDateTime = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
};

const buildQuery = (filters) => {
  const query = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null) {
      query[key] = value;
    }
  });
  return query;
};

const parseResponse = (payload, fallbackPage, fallbackLimit) => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      pagination: {
        page: fallbackPage,
        limit: fallbackLimit,
        total: payload.length,
        totalPages: 1,
        hasNext: false,
        hasPrevious: false,
      },
    };
  }

  return {
    items: Array.isArray(payload?.items) ? payload.items : [],
    pagination: {
      page: payload?.pagination?.page || fallbackPage,
      limit: payload?.pagination?.limit || fallbackLimit,
      total: payload?.pagination?.total || 0,
      totalPages: payload?.pagination?.totalPages || 1,
      hasNext: Boolean(payload?.pagination?.hasNext),
      hasPrevious: Boolean(payload?.pagination?.hasPrevious),
    },
  };
};

const AllLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  });
  const [filters, setFilters] = useState({
    email: "",
    action: "",
    from: "",
    to: "",
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await API.get("/logs/all", {
        params: buildQuery({
          ...filters,
          page,
          limit,
        }),
      });

      const parsed = parseResponse(res.data, page, limit);
      setLogs(parsed.items);
      setPagination(parsed.pagination);
    } catch (err) {
      setError(err?.response?.data?.msg || "Failed to load all logs");
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const summary = useMemo(() => {
    const uniqueUsers = new Set(
      logs.map((log) => log.userId?._id || log.userId?.email || "unknown")
    ).size;

    const actions = logs.reduce((map, log) => {
      const action = log.action || "UNKNOWN";
      map[action] = (map[action] || 0) + 1;
      return map;
    }, {});

    const topAction = Object.entries(actions).sort((a, b) => b[1] - a[1])[0];

    return {
      total: pagination.total,
      uniqueUsers,
      topAction: topAction ? `${topAction[0]} (${topAction[1]})` : "No action",
    };
  }, [logs, pagination.total]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      email: "",
      action: "",
      from: "",
      to: "",
    });
    setPage(1);
  };

  const applyFilters = (event) => {
    event.preventDefault();
    if (page !== 1) {
      setPage(1);
      return;
    }
    fetchLogs();
  };

  const goToPreviousPage = () => {
    if (pagination.hasPrevious) {
      setPage((current) => Math.max(1, current - 1));
    }
  };

  const goToNextPage = () => {
    if (pagination.hasNext) {
      setPage((current) => current + 1);
    }
  };

  return (
    <PortalLayout
      title="All Logs"
      subtitle="Administrative visibility for every event recorded in the chain"
    >
      {error ? <p className="inline-error">{error}</p> : null}

      <section className="glass-card">
        <div className="card-head">
          <h3>Filter Explorer</h3>
          <p>Refine by user, action, or date window</p>
        </div>

        <form className="filter-grid" onSubmit={applyFilters}>
          <label>
            User Email
            <input
              type="email"
              placeholder="user@example.com"
              value={filters.email}
              onChange={(event) => handleFilterChange("email", event.target.value)}
            />
          </label>

          <label>
            Action
            <input
              type="text"
              placeholder="LOGIN_SUCCESS, LOGOUT..."
              value={filters.action}
              onChange={(event) =>
                handleFilterChange("action", event.target.value.toUpperCase())
              }
            />
          </label>

          <label>
            From
            <input
              type="date"
              value={filters.from}
              onChange={(event) => handleFilterChange("from", event.target.value)}
            />
          </label>

          <label>
            To
            <input
              type="date"
              value={filters.to}
              onChange={(event) => handleFilterChange("to", event.target.value)}
            />
          </label>

          <div className="filter-actions">
            <button type="submit" disabled={loading}>
              {loading ? "Loading..." : "Apply filters"}
            </button>
            <button type="button" className="ghost-btn" onClick={resetFilters}>
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="stats-grid compact-grid">
        <article className="metric-card accent-cyan">
          <p>Total Logs</p>
          <h3>{summary.total}</h3>
          <span>Filtered result count</span>
        </article>
        <article className="metric-card accent-indigo">
          <p>Unique Actors</p>
          <h3>{summary.uniqueUsers}</h3>
          <span>Distinct users on this page</span>
        </article>
        <article className="metric-card accent-slate">
          <p>Top Action</p>
          <h3>{summary.topAction.split(" ")[0]}</h3>
          <span>{summary.topAction}</span>
        </article>
      </section>

      <section className="glass-card">
        <div className="card-head">
          <h3>Audit Records</h3>
          <p>Newest entries are displayed first</p>
        </div>

        <div className="table-wrap">
          <table className="log-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="table-empty">
                    {loading ? "Loading logs..." : "No logs match these filters."}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id}>
                    <td>{log.userId?.email || "Unknown"}</td>
                    <td>{log.userId?.role || "N/A"}</td>
                    <td>{log.action || "UNKNOWN"}</td>
                    <td>{formatDateTime(log.timestamp)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <p>
            Showing {logs.length} of {pagination.total} records
          </p>

          <div className="pagination-controls">
            <label className="pagination-select">
              Rows
              <select
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>

            <button
              type="button"
              className="ghost-btn"
              onClick={goToPreviousPage}
              disabled={!pagination.hasPrevious || loading}
            >
              Previous
            </button>

            <span className="pagination-page">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              type="button"
              className="ghost-btn"
              onClick={goToNextPage}
              disabled={!pagination.hasNext || loading}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </PortalLayout>
  );
};

export default AllLogs;
