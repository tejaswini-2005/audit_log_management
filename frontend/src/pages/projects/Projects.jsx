
import { Fragment, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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

const statusOptions = [
  "CREATED",
  "ASSIGNED",
  "IN_PROGRESS",
  "SUBMITTED",
  "APPROVED",
  "COMPLETED",
  "REJECTED",
];

const emptyProject = {
  title: "",
  description: "",
  requirements: "",
  assignedTo: "",
  status: "CREATED",
};

const formatDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }
  return date.toLocaleString();
};

const getStatusBadgeStyle = (projectStatus) => {
  const base = {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.2px",
  };

  switch (projectStatus) {
    case "APPROVED":
      return {
        ...base,
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        color: "#10b981",
      };
    case "REJECTED":
      return {
        ...base,
        backgroundColor: "rgba(239, 68, 68, 0.2)",
        color: "#ef4444",
      };
    case "SUBMITTED":
      return {
        ...base,
        backgroundColor: "rgba(245, 158, 11, 0.2)",
        color: "#f59e0b",
      };
    case "IN_PROGRESS":
      return {
        ...base,
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        color: "#60a5fa",
      };
    case "COMPLETED":
      return {
        ...base,
        backgroundColor: "rgba(34, 197, 94, 0.2)",
        color: "#22c55e",
      };
    default:
      return {
        ...base,
        backgroundColor: "rgba(148, 163, 184, 0.2)",
        color: "#cbd5e1",
      };
  }
};

const Projects = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignmentProject, setAssignmentProject] = useState(null);
  const [detailsProject, setDetailsProject] = useState(null);
  const [detailsSubmission, setDetailsSubmission] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [form, setForm] = useState(emptyProject);
  const [assignmentUserEmail, setAssignmentUserEmail] = useState("");
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewingSubmission, setReviewingSubmission] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const fetchProjects = async () => {
    setLoading(true);

    try {
      const response = await API.get("/projects");
      const nextProjects = Array.isArray(response.data) ? response.data : [];
      setProjects(nextProjects);
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to load projects",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await API.get("/auth/list");
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  useEffect(() => {
    fetchProjects();
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const totalAssigned = useMemo(
    () => projects.filter((project) => project.assignedTo).length,
    [projects]
  );

  const handleCreateProject = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      await API.post("/projects", {
        title: form.title,
        description: form.description,
        requirements: form.requirements,
        assignedTo: form.assignedTo || undefined,
        status: form.status,
      });

      setForm(emptyProject);
      await fetchProjects();
      setStatus({ type: "success", message: "Project created" });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Could not create project",
      });
    } finally {
      setSaving(false);
    }
  };

  const openAssignModal = (project) => {
    setAssignmentProject(project);
    setAssignmentUserEmail(project?.assignedTo?.email || "");
    setIsAssignModalOpen(true);
  };

  const loadProjectProgress = async (projectId, fallbackProject = null) => {
    const [projectResponse, submissionResponse] = await Promise.all([
      API.get(`/projects/${projectId}`),
      API.get(`/submissions?projectId=${projectId}`),
    ]);

    const freshProject = projectResponse.data || fallbackProject;
    const submissionList = Array.isArray(submissionResponse.data?.submissions)
      ? submissionResponse.data.submissions
      : [];
    const latestSubmission = submissionList.length > 0 ? submissionList[0] : null;

    setDetailsProject(freshProject);
    setDetailsSubmission(latestSubmission);
  };

  const openDetailsModal = async (project) => {
    setLoadingDetails(true);
    setDetailsSubmission(null);
    setIsDetailsModalOpen(true);

    try {
      await loadProjectProgress(project._id, project);
    } catch (err) {
      setDetailsProject(project);
      setDetailsSubmission(null);
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to load latest project progress details",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAdminReviewFromProgress = async (decision) => {
    if (!isAdmin || !detailsSubmission?._id || !detailsProject?._id) {
      return;
    }

    if (!["APPROVED", "REJECTED"].includes(decision)) {
      return;
    }

    setReviewingSubmission(true);
    setStatus({ type: "", message: "" });

    try {
      await API.post(`/submissions/${detailsSubmission._id}/review`, {
        status: decision,
        feedback: "",
      });

      await Promise.all([
        fetchProjects(),
        loadProjectProgress(detailsProject._id, detailsProject),
      ]);

      setStatus({
        type: "success",
        message:
          decision === "APPROVED"
            ? "Submission approved from Progress tab. User status updated."
            : "Submission rejected from Progress tab. User status updated.",
      });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to review submission from progress tab",
      });
    } finally {
      setReviewingSubmission(false);
    }
  };

  const handleAssignProject = async (event) => {
    event.preventDefault();

    if (!assignmentProject?._id) {
      setStatus({ type: "error", message: "Select a project first" });
      return;
    }

    if (!assignmentUserEmail.trim()) {
      setStatus({ type: "error", message: "Select a user to assign" });
      return;
    }

    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      await API.post(`/projects/${assignmentProject._id}/assign`, {
        userEmail: assignmentUserEmail.trim(),
      });

      await fetchProjects();
      setIsAssignModalOpen(false);
      setAssignmentProject(null);
      setStatus({ type: "success", message: "Project assigned successfully" });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to assign project",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (projectId, projectTitle) => {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${projectTitle}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      await API.delete(`/projects/${projectId}`);
      await fetchProjects();
      setStatus({ type: "success", message: "Project deleted successfully" });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to delete project",
      });
    } finally {
      setSaving(false);
    }
  };

  const assignModal =
    isAdmin && isAssignModalOpen && assignmentProject
      ? createPortal(
          <div className="project-assign-overlay" role="dialog" aria-modal="true">
            <div className="project-assign-modal glass-card project-progress-modal">
              <div className="assistant-modal-head">
                <div className="assistant-title-wrap">
                  <div>
                    <h3>Assign Project</h3>
                    <p>{assignmentProject.title}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setIsAssignModalOpen(false);
                    setAssignmentProject(null);
                  }}
                >
                  Close
                </button>
              </div>

              <form className="stack-form" onSubmit={handleAssignProject}>
                <label htmlFor="project-assignment-user-email">Select User</label>
                <select
                  id="project-assignment-user-email"
                  value={assignmentUserEmail}
                  onChange={(e) => setAssignmentUserEmail(e.target.value)}
                  required
                >
                  <option value="">-- Choose a user --</option>
                  {users.map((u) => (
                    <option key={u._id} value={u.email}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                <button type="submit" disabled={saving}>
                  {saving ? "Assigning..." : "Assign project"}
                </button>
              </form>
            </div>
          </div>,
          document.body
        )
      : null;

  const detailsModal =
    isAdmin && isDetailsModalOpen && detailsProject
      ? createPortal(
          <div className="project-assign-overlay" role="dialog" aria-modal="true">
            <div className="project-assign-modal glass-card">
              <div className="assistant-modal-head">
                <div className="assistant-title-wrap">
                  <div>
                    <h3>Project Progress</h3>
                    <p>{detailsProject.title}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    setDetailsProject(null);
                    setDetailsSubmission(null);
                  }}
                >
                  Close
                </button>
              </div>

              <div className="project-progress-body">
                {loadingDetails ? <p>Loading latest progress...</p> : null}

                <div className="project-progress-grid">
                  <div className="project-progress-item">
                    <label>Current Status</label>
                    <p className="project-progress-status">
                    {detailsProject.status}
                    </p>
                  </div>

                  <div className="project-progress-item">
                    <label>Assigned To</label>
                    <p>
                      {detailsProject.assignedTo
                        ? `${detailsProject.assignedTo.name} (${detailsProject.assignedTo.email})`
                        : "Unassigned"}
                    </p>
                  </div>

                  <div className="project-progress-item">
                    <label>Created By</label>
                    <p>
                      {detailsProject.createdBy
                        ? `${detailsProject.createdBy.name} (${detailsProject.createdBy.email})`
                        : "Unknown"}
                    </p>
                  </div>

                  <div className="project-progress-item">
                    <label>Last Updated</label>
                    <p>{formatDate(detailsProject.updatedAt)}</p>
                  </div>
                </div>

                <div className="project-progress-submission">
                  <label>Latest Submission</label>
                  {detailsSubmission ? (
                    <div>
                      {detailsSubmission.fileUrlWord ? (
                        <a
                          href={toAbsoluteDocumentUrl(detailsSubmission.fileUrlWord)}
                          target="_blank"
                          rel="noreferrer"
                          className="project-progress-doc-link"
                        >
                          <span className="project-progress-doc-icon" aria-hidden="true">DOC</span>
                          <span>View Submitted Word Document</span>
                        </a>
                      ) : (
                        <p className="project-progress-note">No Word document submitted yet.</p>
                      )}

                      {isAdmin && detailsSubmission.status === "SUBMITTED" ? (
                        <div className="project-progress-review-actions">
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={() => handleAdminReviewFromProgress("APPROVED")}
                            disabled={reviewingSubmission}
                            style={{ color: "#10b981" }}
                          >
                            {reviewingSubmission ? "Processing..." : "Approve"}
                          </button>
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={() => handleAdminReviewFromProgress("REJECTED")}
                            disabled={reviewingSubmission}
                            style={{ color: "#ef4444" }}
                          >
                            {reviewingSubmission ? "Processing..." : "Reject"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p>No submission found for this project yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <PortalLayout
      title="Projects"
      subtitle="Manage assignments, delivery status, and traceable project execution"
    >
      {status.message ? (
        <p className={status.type === "error" ? "inline-error" : "inline-success"}>
          {status.message}
        </p>
      ) : null}

      <section className="stats-grid compact-grid">
        <article className="metric-card accent-cyan">
          <p>Total Projects</p>
          <h3>{projects.length}</h3>
          <span>Visible in your scope</span>
        </article>
        <article className="metric-card accent-indigo">
          <p>Assigned</p>
          <h3>{totalAssigned}</h3>
          <span>With assignee linked</span>
        </article>
        <article className="metric-card accent-emerald">
          <p>Role</p>
          <h3>{isAdmin ? "ADMIN" : "USER"}</h3>
          <span>Access level context</span>
        </article>
      </section>

      {isAdmin ? (
        <section className="glass-card">
          <div className="card-head">
            <h3>Create Project</h3>
            <p>Admin-only project creation endpoint</p>
          </div>

          <form className="project-create-form" onSubmit={handleCreateProject}>
            <div className="field-block">
              <label htmlFor="project-title">Title</label>
              <input
                id="project-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Vendor onboarding workflow"
                required
              />
            </div>

            <div className="field-block">
              <label htmlFor="project-assigned-to">Assign User (optional)</label>
              <select
                id="project-assigned-to"
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              >
                <option value="">-- No assignment --</option>
                {users.map((u) => (
                  <option key={u._id} value={u.email}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="field-block">
              <label htmlFor="project-description">Description</label>
              <textarea
                id="project-description"
                rows="4"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Business context and expected outcome"
                required
              />
            </div>

            <div className="field-block">
              <label htmlFor="project-requirements">Requirements</label>
              <textarea
                id="project-requirements"
                rows="4"
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                placeholder="List acceptance criteria and constraints"
              />
            </div>

            <button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create project"}
            </button>
          </form>
        </section>
      ) : null}

      <section>
        <article className="glass-card">
          <div className="card-head">
            <h3>Project List</h3>
            <p>{loading ? "Loading..." : `${projects.length} projects`}</p>
          </div>

          <div className="table-wrap">
            <table className="log-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {!loading && projects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="table-empty">
                      No projects found.
                    </td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <Fragment key={project._id}>
                      <tr key={`${project._id}-summary`}>
                        <td>{project.title}</td>
                        <td>
                          <span style={getStatusBadgeStyle(project.status)}>{project.status}</span>
                        </td>
                        <td>{project.assignedTo?.email || "Unassigned"}</td>
                        <td>{formatDate(project.updatedAt)}</td>
                      </tr>

                      {isAdmin ? (
                        <tr key={`${project._id}-actions`}>
                          <td colSpan={4}>
                            <div className="project-action-grid">
                              <button
                                type="button"
                                className="ghost-btn btn-progress"
                                onClick={() => openDetailsModal(project)}
                                title="View project progress and details"
                              >
                                Progress
                              </button>
                              <button
                                type="button"
                                className="ghost-btn btn-assign"
                                onClick={() => openAssignModal(project)}
                                disabled={saving || !!project.assignedTo}
                                title={project.assignedTo ? "Already assigned" : "Assign to user"}
                              >
                                {project.assignedTo ? "Assigned" : "Assign"}
                              </button>
                              <button
                                type="button"
                                className="ghost-btn btn-delete"
                                onClick={() => handleDeleteProject(project._id, project.title)}
                                disabled={saving}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      {assignModal}
      {detailsModal}
    </PortalLayout>
  );
};

export default Projects;
