import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import API from "../../api/axios";
import PortalLayout from "../../components/PortalLayout";
import { useAuth } from "../../context/useAuth";

const normalizeSubmission = (payload) => {
  if (Array.isArray(payload)) {
    return payload[0] || null;
  }
  return payload || null;
};

const getStatusLabel = (submissionStatus) => {
  switch (submissionStatus) {
    case "APPROVED":
      return "Approved by Admin";
    case "REJECTED":
      return "Rejected by Admin";
    case "SUBMITTED":
      return "Awaiting admin review";
    case "DRAFT":
    default:
      return "Draft in progress";
  }
};

const Submission = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [submission, setSubmission] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingSubmission, setLoadingSubmission] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingWord, setGeneratingWord] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const selectedProject = useMemo(
    () => projects.find((project) => project._id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  if (user?.role === "ADMIN") {
    return <Navigate to="/forbidden" replace />;
  }

  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const response = await API.get("/projects");
      const nextProjects = Array.isArray(response.data) ? response.data : [];
      setProjects(nextProjects);

      setSelectedProjectId((currentProjectId) => {
        if (currentProjectId || nextProjects.length === 0) {
          return currentProjectId;
        }
        return nextProjects[0]._id;
      });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to load projects",
      });
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const fetchSubmission = useCallback(async (projectId) => {
    if (!projectId) return;

    setLoadingSubmission(true);
    try {
      const response = await API.get(`/submissions/${projectId}`);
      const currentSubmission = normalizeSubmission(response.data);
      setSubmission(currentSubmission);
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to load submission",
      });
    } finally {
      setLoadingSubmission(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchSubmission(selectedProjectId);
    }
  }, [selectedProjectId, fetchSubmission]);

  useEffect(() => {
    if (!selectedProjectId) return undefined;

    const intervalId = window.setInterval(() => {
      fetchSubmission(selectedProjectId);
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [selectedProjectId, fetchSubmission]);

  const handleGeneratePdf = async () => {
    if (!selectedProjectId || !submission?.content) {
      setStatus({ type: "error", message: "No content to generate PDF" });
      return;
    }

    setGeneratingPdf(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await API.post("/documents/generate-pdf", {
        projectId: selectedProjectId,
        content: submission.content,
      });

      setStatus({ type: "success", message: "PDF generated successfully" });
      await fetchSubmission(selectedProjectId);
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to generate PDF",
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleGenerateWord = async () => {
    if (!selectedProjectId || !submission?.content) {
      setStatus({ type: "error", message: "No content to generate Word document" });
      return;
    }

    setGeneratingWord(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await API.post("/documents/generate-word", {
        projectId: selectedProjectId,
        content: submission.content,
      });

      setStatus({ type: "success", message: "Word document generated successfully" });
      await fetchSubmission(selectedProjectId);
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to generate Word document",
      });
    } finally {
      setGeneratingWord(false);
    }
  };

  const handleGenerateBoth = async () => {
    if (!selectedProjectId || !submission?.content) {
      setStatus({ type: "error", message: "No content to generate documents" });
      return;
    }

    setGeneratingPdf(true);
    setGeneratingWord(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await API.post("/documents/generate-both", {
        projectId: selectedProjectId,
        content: submission.content,
      });

      setStatus({ type: "success", message: "Both documents generated successfully" });
      await fetchSubmission(selectedProjectId);
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to generate documents",
      });
    } finally {
      setGeneratingPdf(false);
      setGeneratingWord(false);
    }
  };

  const handleSubmit = async () => {
    if (!submission?._id) {
      setStatus({ type: "error", message: "No submission to submit" });
      return;
    }

    if (!submission.content && !submission.fileUrlPDF && !submission.fileUrlWord && !submission.fileUrl) {
      setStatus({ type: "error", message: "No content or files to submit" });
      return;
    }

    setSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      await API.post(`/submissions/${submission._id}/submit`);
      setStatus({ type: "success", message: "Submission submitted successfully" });
      await fetchSubmission(selectedProjectId);
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to submit",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PortalLayout
      title="Document Generation & Submission"
      subtitle="Generate PDF/Word documents and submit your work for review"
    >
      {status.message ? (
        <p className={status.type === "error" ? "inline-error" : "inline-success"}>
          {status.message}
        </p>
      ) : null}

      {submission?.status === "APPROVED" ? (
        <p className="inline-success">Your submission has been APPROVED by admin.</p>
      ) : null}
      {submission?.status === "REJECTED" ? (
        <p className="inline-error">Your submission has been REJECTED by admin. Please update and resubmit.</p>
      ) : null}

      <section className="stats-grid compact-grid">
        <article className="metric-card accent-cyan">
          <p>Project</p>
          <h3>{selectedProject?.title || "None"}</h3>
          <span>Currently selected</span>
        </article>
        <article className="metric-card accent-indigo">
          <p>Status</p>
          <h3>{submission?.status || "None"}</h3>
          <span>{getStatusLabel(submission?.status)}</span>
        </article>
        <article className="metric-card accent-emerald">
          <p>Content</p>
          <h3>{submission?.content ? "✓" : "—"}</h3>
          <span>Content exists</span>
        </article>
        <article className="metric-card accent-orange">
          <p>Documents</p>
          <h3>{(submission?.fileUrlPDF ? 1 : 0) + (submission?.fileUrlWord ? 1 : 0)}</h3>
          <span>Generated files</span>
        </article>
      </section>

      <section className="grid-two-col">
        <article className="glass-card">
          <div className="card-head">
            <h3>Project Selection</h3>
            <p>Select a project to manage submissions</p>
          </div>

          <form className="stack-form">
            <label htmlFor="project-select">Project</label>
            <select
              id="project-select"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              disabled={loadingProjects}
            >
              <option value="">Select a project</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.title}
                </option>
              ))}
            </select>

            <p className="muted-copy">
              Choose a project to view submission details and generate documents.
            </p>
          </form>
        </article>

        <article className="glass-card">
          <div className="card-head">
            <h3>Submission Details</h3>
            <p>{selectedProject?.title || "No project selected"}</p>
          </div>

          {loadingSubmission ? (
            <p>Loading submission...</p>
          ) : submission ? (
            <div className="stack-form">
              <div>
                <p><strong>Status:</strong> {submission.status}</p>
                <p><strong>Content:</strong> {submission.content?.length || 0} characters</p>
                <p><strong>Created:</strong> {new Date(submission.createdAt).toLocaleDateString()}</p>
              </div>

              {submission.status === "DRAFT" && (
                <div className="grid-two-col">
                  <button
                    onClick={handleGeneratePdf}
                    disabled={generatingPdf || !submission.content}
                    className="btn-primary"
                  >
                    {generatingPdf ? "Generating PDF..." : "Generate PDF"}
                  </button>
                  <button
                    onClick={handleGenerateWord}
                    disabled={generatingWord || !submission.content}
                    className="btn-primary"
                  >
                    {generatingWord ? "Generating Word..." : "Generate Word"}
                  </button>
                  <button
                    onClick={handleGenerateBoth}
                    disabled={generatingPdf || generatingWord || !submission.content}
                    className="btn-success"
                  >
                    {generatingPdf || generatingWord ? "Generating..." : "Generate Both"}
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || (!submission.content && !submission.fileUrlPDF && !submission.fileUrlWord)}
                    className="btn-success"
                  >
                    {submitting ? "Submitting..." : "Submit for Review"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p>No submission found. Create draft content first.</p>
          )}
        </article>
      </section>

      {submission && (
        <section className="glass-card">
          <div className="card-head">
            <h3>Generated Documents</h3>
            <p>Files generated from your content</p>
          </div>

          <div className="grid-two-col">
            {submission.fileUrlPDF && (
              <article className="document-card">
                <h4>📄 PDF Document</h4>
                <p>Generated PDF for download</p>
                <a href={submission.fileUrlPDF} download className="btn-link">
                  Download PDF
                </a>
              </article>
            )}

            {submission.fileUrlWord && (
              <article className="document-card">
                <h4>📘 Word Document</h4>
                <p>Generated Word (.docx) document</p>
                <a href={submission.fileUrlWord} download className="btn-link">
                  Download Word
                </a>
              </article>
            )}

            {!submission.fileUrlPDF && !submission.fileUrlWord && (
              <article className="document-card">
                <h4>No Documents</h4>
                <p>Generate documents from your content first</p>
              </article>
            )}
          </div>
        </section>
      )}

      {submission?.content && (
        <section className="glass-card">
          <div className="card-head">
            <h3>Content Preview</h3>
            <p>Your submission content</p>
          </div>

          <div className="content-preview">
            <p>{submission.content.substring(0, 500)}...</p>
          </div>
        </section>
      )}
    </PortalLayout>
  );
};

export default Submission;
