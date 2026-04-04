import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import API from "../../api/axios";
import PortalLayout from "../../components/PortalLayout";
import { useAuth } from "../../context/useAuth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";
const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, "");

const toAbsoluteDocumentUrl = (fileUrl) => {
  const value = String(fileUrl || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${BACKEND_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`;
};

const SubmissionReview = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [statusFilter, setStatusFilter] = useState("SUBMITTED");
  const [status, setStatus] = useState({ type: "", message: "" });

  if (user?.role !== "ADMIN") {
    return <Navigate to="/forbidden" replace />;
  }

  const fetchSubmissions = useCallback(async (filter = "SUBMITTED") => {
    setLoadingSubmissions(true);
    try {
      let url = "/submissions";
      if (filter && filter !== "ALL") {
        url += `?status=${filter}`;
      }
      const response = await API.get(url);
      const allSubmissions = Array.isArray(response.data?.submissions || response.data)
        ? response.data?.submissions || response.data
        : [];

      // Sort by date descending
      allSubmissions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setSubmissions(allSubmissions);
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to load submissions",
      });
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions(statusFilter);
  }, [statusFilter, fetchSubmissions]);

  const handleApprove = async () => {
    if (!selectedSubmission?._id) return;

    setReviewing(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await API.post(`/submissions/${selectedSubmission._id}/review`, {
        status: "APPROVED",
        feedback: feedback.trim(),
      });

      setStatus({ type: "success", message: "✓ Submission approved" });
      setFeedback("");
      await fetchSubmissions(statusFilter);
      setSelectedSubmission(null);
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to approve submission",
      });
    } finally {
      setReviewing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedSubmission?._id) return;

    setReviewing(true);
    setStatus({ type: "", message: "" });

    try {
      await API.post(`/submissions/${selectedSubmission._id}/review`, {
        status: "REJECTED",
        feedback: feedback.trim(),
      });

      setStatus({ type: "success", message: "✓ Submission rejected" });
      setFeedback("");
      await fetchSubmissions(statusFilter);
      setSelectedSubmission(null);
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to reject submission",
      });
    } finally {
      setReviewing(false);
    }
  };

  const getStatusColor = (submissionStatus) => {
    switch (submissionStatus) {
      case "DRAFT":
        return "#6b7280";
      case "SUBMITTED":
        return "#f59e0b";
      case "APPROVED":
        return "#10b981";
      case "REJECTED":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const submittedCount = submissions.filter((s) => s.status === "SUBMITTED").length;
  const approvedCount = submissions.filter((s) => s.status === "APPROVED").length;
  const rejectedCount = submissions.filter((s) => s.status === "REJECTED").length;

  return (
    <PortalLayout
      title="Submission Review Dashboard"
      subtitle="Review all user submissions, download documents, and track progress"
    >
      {status.message ? (
        <p className={status.type === "error" ? "inline-error" : "inline-success"}>
          {status.message}
        </p>
      ) : null}

      <section className="stats-grid compact-grid">
        <article className="metric-card accent-cyan">
          <p>Pending Review</p>
          <h3>{submittedCount}</h3>
          <span>Awaiting your decision</span>
        </article>
        <article className="metric-card accent-emerald">
          <p>Approved</p>
          <h3>{approvedCount}</h3>
          <span>Successfully approved</span>
        </article>
        <article className="metric-card accent-red">
          <p>Rejected</p>
          <h3>{rejectedCount}</h3>
          <span>Sent back for revision</span>
        </article>
        <article className="metric-card accent-indigo">
          <p>Total</p>
          <h3>{submissions.length}</h3>
          <span>All submissions</span>
        </article>
      </section>

      <section className="grid-two-col">
        <article className="glass-card">
          <div className="card-head">
            <h3>Submissions List</h3>
            <p>View and manage submissions</p>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label htmlFor="status-filter">Filter by Status</label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="SUBMITTED">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ALL">All Submissions</option>
            </select>
          </div>

          <div className="timeline-list" style={{ maxHeight: "500px", overflowY: "auto" }}>
            {loadingSubmissions ? (
              <p>Loading submissions...</p>
            ) : submissions.length === 0 ? (
              <article>
                <span>—</span>
                <p>No submissions found for this status</p>
              </article>
            ) : (
              submissions.map((submission) => (
                <article
                  key={submission._id}
                  onClick={() => {
                    setSelectedSubmission(submission);
                    setFeedback("");
                  }}
                  style={{
                    cursor: "pointer",
                    opacity: selectedSubmission?._id === submission._id ? 1 : 0.7,
                    backgroundColor:
                      selectedSubmission?._id === submission._id ? "rgba(255,255,255,0.1)" : "transparent",
                    padding: "10px",
                    borderRadius: "5px",
                    borderLeft: `4px solid ${getStatusColor(submission.status)}`,
                  }}
                >
                  <span style={{ backgroundColor: getStatusColor(submission.status) }}>
                    {submission.userId?.name?.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p>
                      <strong>{submission.userId?.name || "Unknown"}</strong>
                      <span
                        style={{
                          marginLeft: "10px",
                          fontSize: "0.8em",
                          padding: "2px 6px",
                          backgroundColor: getStatusColor(submission.status),
                          color: "white",
                          borderRadius: "3px",
                        }}
                      >
                        {submission.status}
                      </span>
                    </p>
                    <p className="muted-copy">
                      <strong>Project:</strong> {submission.projectId?.title || "Unknown"}
                    </p>
                    <p className="muted-copy">
                      <strong>Submitted:</strong> {new Date(submission.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="glass-card">
          <div className="card-head">
            <h3>Review & Action</h3>
            <p>Review submission details and take action</p>
          </div>

          {selectedSubmission ? (
            <div className="stack-form">
              <div style={{ backgroundColor: "#f3f4f6", padding: "15px", borderRadius: "5px" }}>
                <p style={{ marginBottom: "8px" }}>
                  <strong>Submitted By:</strong> {selectedSubmission.userId?.name}
                </p>
                <p style={{ marginBottom: "8px" }}>
                  <strong>Email:</strong> {selectedSubmission.userId?.email}
                </p>
                <p style={{ marginBottom: "8px" }}>
                  <strong>Project:</strong> {selectedSubmission.projectId?.title}
                </p>
                <p style={{ marginBottom: "8px" }}>
                  <strong>Status:</strong>
                  <span
                    style={{
                      marginLeft: "8px",
                      padding: "4px 8px",
                      backgroundColor: getStatusColor(selectedSubmission.status),
                      color: "white",
                      borderRadius: "3px",
                      fontSize: "0.9em",
                    }}
                  >
                    {selectedSubmission.status}
                  </span>
                </p>
                <p style={{ marginBottom: "0", fontSize: "0.85em", color: "#999" }}>
                  <strong>Submitted:</strong> {new Date(selectedSubmission.updatedAt).toLocaleString()}
                </p>
              </div>

              {selectedSubmission.fileUrlWord && (
                <div>
                  <a
                    href={toAbsoluteDocumentUrl(selectedSubmission.fileUrlWord)}
                    download
                    style={{
                      display: "inline-block",
                      padding: "10px 15px",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      textDecoration: "none",
                      borderRadius: "5px",
                      marginBottom: "15px",
                      width: "100%",
                      textAlign: "center",
                    }}
                  >
                    📘 Download Word Document
                  </a>
                </div>
              )}

              {selectedSubmission.status === "SUBMITTED" ? (
                <>
                  <label htmlFor="feedback-textarea">Feedback (Optional)</label>
                  <textarea
                    id="feedback-textarea"
                    rows="4"
                    value={feedback}
                    onChange={(event) => setFeedback(event.target.value)}
                    placeholder="Provide feedback about the submission..."
                    maxLength="5000"
                  />

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={reviewing}
                      style={{
                        flex: 1,
                        backgroundColor: "#10b981",
                        color: "white",
                        padding: "10px",
                        border: "none",
                        borderRadius: "5px",
                        cursor: reviewing ? "not-allowed" : "pointer",
                        opacity: reviewing ? 0.6 : 1,
                      }}
                    >
                      {reviewing ? "Processing..." : "✓ Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={reviewing}
                      style={{
                        flex: 1,
                        backgroundColor: "#ef4444",
                        color: "white",
                        padding: "10px",
                        border: "none",
                        borderRadius: "5px",
                        cursor: reviewing ? "not-allowed" : "pointer",
                        opacity: reviewing ? 0.6 : 1,
                      }}
                    >
                      {reviewing ? "Processing..." : "✗ Reject"}
                    </button>
                  </div>
                </>
              ) : (
                <p style={{ color: "#999", fontStyle: "italic" }}>
                  This submission has already been {selectedSubmission.status.toLowerCase()}
                </p>
              )}
            </div>
          ) : (
            <p style={{ color: "#999" }}>Select a submission to review</p>
          )}
        </article>
      </section>

      {selectedSubmission?.content && (
        <section className="glass-card">
          <div className="card-head">
            <h3>Submitted Content</h3>
            <p>Full text submitted by user</p>
          </div>

          <div
            style={{
              backgroundColor: "#f9fafb",
              padding: "15px",
              borderRadius: "5px",
              maxHeight: "400px",
              overflowY: "auto",
              lineHeight: "1.6",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
              fontFamily: "monospace",
              fontSize: "0.9em",
            }}
          >
            {selectedSubmission.content}
          </div>
        </section>
      )}
    </PortalLayout>
  );
};

export default SubmissionReview;
