import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../../api/axios";
import PortalLayout from "../../components/PortalLayout";

const formatDateTime = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString();
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

const MyLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
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

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await API.get("/logs/me", {
        params: {
          page,
          limit,
        },
      });

      const parsed = parseResponse(res.data, page, limit);
      setLogs(parsed.items);
      setPagination(parsed.pagination);
    } catch (err) {
      setError(err?.response?.data?.msg || "Unable to load your logs");
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = useMemo(() => {
    if (!search) return logs;

    const query = search.toLowerCase();

    return logs.filter((log) => {
      const action = String(log.action || "").toLowerCase();
      const hash = String(log.currentHash || "").toLowerCase();

      return action.includes(query) || hash.includes(query);
    });
  }, [logs, search]);

  return (
    <PortalLayout
      title="My Activity"
      subtitle="Your personal immutable timeline of security events"
    >
      {error ? <p className="inline-error">{error}</p> : null}

      <section className="glass-card">
        <div className="card-head">
          <h3>Search Logs</h3>
          <p>Filter current page by action name or hash fragment</p>
        </div>

        <div className="toolbar-row">
          <input
            type="text"
            placeholder="Search LOGIN, LOGOUT, hash..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <button type="button" onClick={fetchLogs} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>

      <section className="glass-card">
        <div className="card-head">
          <h3>My Log Stream</h3>
          <p>{filteredLogs.length} events in current view</p>
        </div>

        <div className="table-wrap">
          <table className="log-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Timestamp</th>
                <th>Current Hash</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="3" className="table-empty">
                    {loading ? "Loading your logs..." : "No matching activity found."}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log._id}>
                    <td>{log.action || "UNKNOWN"}</td>
                    <td>{formatDateTime(log.timestamp)}</td>
                    <td>{log.currentHash || "N/A"}</td>
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
              onClick={() => setPage((current) => Math.max(1, current - 1))}
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
              onClick={() => setPage((current) => current + 1)}
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

export default MyLogs;
