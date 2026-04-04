import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Navigate } from "react-router-dom";
import API from "../../api/axios";
import PortalLayout from "../../components/PortalLayout";
import { useAuth } from "../../context/useAuth";

const emptyDraft = {
  projectId: "",
  content: "",
};

const normalizeSubmission = (payload) => {
  if (Array.isArray(payload)) {
    return payload[0] || null;
  }

  return payload || null;
};

const ContentEditor = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [draft, setDraft] = useState(emptyDraft);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [converting, setConverting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiTone, setAiTone] = useState("professional");
  const [submissionId, setSubmissionId] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState("DRAFT");
  const [wordUrl, setWordUrl] = useState("");
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [activeInputMethod, setActiveInputMethod] = useState("ocr");
  const [isOcrDragActive, setIsOcrDragActive] = useState(false);
  const manualEditorRef = useRef(null);

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

        const firstProjectId = nextProjects[0]._id;
        setDraft((current) => ({ ...current, projectId: firstProjectId }));
        return firstProjectId;
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

  const fetchDraft = useCallback(async (projectId) => {
    if (!projectId) return;

    setLoadingDraft(true);

    try {
      const response = await API.get(`/submissions/${projectId}`);
      const currentSubmission = normalizeSubmission(response.data);

      setDraft({
        projectId,
        content: currentSubmission?.content || "",
      });
      setSubmissionId(currentSubmission?._id || null);
      setSubmissionStatus(currentSubmission?.status || "DRAFT");
      setWordUrl(currentSubmission?.fileUrlWord || "");
      setIsDraftDirty(false);
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to load submission draft",
      });
    } finally {
      setLoadingDraft(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      setIsDraftDirty(false);
      setDraft((current) => ({ ...current, projectId: selectedProjectId }));
      fetchDraft(selectedProjectId);
    }
  }, [selectedProjectId, fetchDraft]);

  useEffect(() => {
    if (!selectedProjectId) return undefined;

    const intervalId = window.setInterval(() => {
      if (isDraftDirty) return;
      fetchDraft(selectedProjectId);
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [selectedProjectId, fetchDraft, isDraftDirty]);

  const handleOcrUpload = async (event) => {
    event.preventDefault();

    if (!selectedProjectId) {
      setStatus({ type: "error", message: "Select a project first" });
      return;
    }

    if (!selectedFile) {
      setStatus({ type: "error", message: "Choose an image or PDF file" });
      return;
    }

    setExtracting(true);
    setStatus({ type: "", message: "" });

    try {
      const formData = new FormData();
      formData.append("projectId", selectedProjectId);
      formData.append("file", selectedFile);

      const response = await API.post("/ocr/extract-text", formData);
      const extractedText = String(response.data?.extractedText || "");
      setDraft({ projectId: selectedProjectId, content: extractedText });
      setIsDraftDirty(true);
      setStatus({ type: "success", message: "Text extracted and loaded into editor" });
      setSelectedFile(null);
      setIsOcrModalOpen(false);
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "OCR extraction failed",
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleOcrFileSelect = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleOcrDragOver = (event) => {
    event.preventDefault();
    setIsOcrDragActive(true);
  };

  const handleOcrDragLeave = (event) => {
    event.preventDefault();
    setIsOcrDragActive(false);
  };

  const handleOcrDrop = (event) => {
    event.preventDefault();
    setIsOcrDragActive(false);

    const file = event.dataTransfer?.files?.[0] || null;
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleOpenOcrMethod = () => {
    setActiveInputMethod("ocr");
    setIsOcrModalOpen(true);
  };

  const handleOpenAiMethod = () => {
    setActiveInputMethod("ai");
    setIsAIModalOpen(true);
  };

  const handleOpenManualMethod = () => {
    setActiveInputMethod("manual");
    manualEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    manualEditorRef.current?.focus();
  };

  const ensureDraftSubmission = async () => {
    if (!selectedProjectId) {
      setStatus({ type: "error", message: "Select a project first" });
      return null;
    }

    if (!draft.content.trim()) {
      setStatus({ type: "error", message: "Content cannot be empty" });
      return null;
    }

    try {
      const response = await API.post("/submissions", {
        projectId: selectedProjectId,
        content: draft.content,
      });

      const nextSubmissionId = response.data?._id || null;
      setSubmissionId(nextSubmissionId);
      setSubmissionStatus(response.data?.status || "DRAFT");
      setWordUrl(response.data?.fileUrlWord || "");
      setIsDraftDirty(false);
      return nextSubmissionId;
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to prepare content for conversion",
      });
      return null;
    }
  };

  const handleConvertToWord = async () => {
    if (!draft.content.trim()) {
      setStatus({ type: "error", message: "Content cannot be empty" });
      return;
    }

    setConverting(true);
    setStatus({ type: "", message: "" });

    try {
      const nextSubmissionId = await ensureDraftSubmission();
      if (!nextSubmissionId) {
        return;
      }

      const response = await API.post(`/submissions/${nextSubmissionId}/convert-word`);
      const nextWordUrl = response.data?.submission?.fileUrlWord || "";
      setWordUrl(nextWordUrl);
      setStatus({ type: "success", message: "Word conversion completed. You can now preview and submit to admin." });
      await fetchDraft(selectedProjectId);
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to convert content to Word",
      });
    } finally {
      setConverting(false);
    }
  };

  const handleGenerateAI = async (event) => {
    event.preventDefault();

    if (!selectedProjectId || !selectedProject) {
      setStatus({ type: "error", message: "Select a project first" });
      return;
    }

    if (!aiPrompt.trim()) {
      setStatus({ type: "error", message: "Please enter a prompt for AI generation" });
      return;
    }

    setGeneratingAI(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await API.post("/ai/generate-content", {
        projectTitle: selectedProject.title,
        projectDescription: selectedProject.description,
        prompt: aiPrompt,
        tone: aiTone,
      });

      const aiContent = String(response.data?.text || "");
      setDraft({ projectId: selectedProjectId, content: aiContent });
      setIsDraftDirty(true);
      setStatus({ type: "success", message: "AI content generated and loaded into editor" });
      setIsAIModalOpen(false);
      setAiPrompt("");
      setAiTone("professional");
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "AI generation failed",
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!submissionId) {
      setStatus({ type: "error", message: "Please convert to Word before submitting" });
      return;
    }

    if (!draft.content.trim()) {
      setStatus({ type: "error", message: "Content cannot be empty" });
      return;
    }

    if (!wordUrl) {
      setStatus({ type: "error", message: "Please convert to Word before submitting to admin" });
      return;
    }

    if (!window.confirm("Submit this content as a Word document to admin? This action cannot be undone.")) {
      return;
    }

    setSubmitting(true);
    setStatus({ type: "", message: "" });

    try {
      const response = await API.post(`/submissions/${submissionId}/submit`);

      setStatus({ type: "success", message: "✓ Submission successful! Word document generated and sent to admin." });
      setSubmissionStatus(response.data?.submission?.status || "SUBMITTED");
      await fetchDraft(selectedProjectId);
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to submit",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const ocrModal = isOcrModalOpen
    ? createPortal(
        <div
          className="project-assign-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsOcrModalOpen(false)}
        >
          <article
            className="project-assign-modal glass-card ocr-upload-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-head">
              <div className="assistant-title-wrap">
                <div>
                  <h3>Upload for OCR</h3>
                  <p>Select a PDF/image and extract text</p>
                </div>
              </div>

              <button
                type="button"
                className="ghost-btn"
                onClick={() => setIsOcrModalOpen(false)}
              >
                Close
              </button>
            </div>

            <form className="stack-form ocr-modal-form" onSubmit={handleOcrUpload}>
              <label
                htmlFor="ocr-modal-file"
                className={`ocr-dropzone ${isOcrDragActive ? "is-active" : ""}`}
                onDragOver={handleOcrDragOver}
                onDragLeave={handleOcrDragLeave}
                onDrop={handleOcrDrop}
                aria-label="Upload OCR file"
              >
                <input
                  id="ocr-modal-file"
                  type="file"
                  accept="image/*,.pdf"
                  className="ocr-dropzone-input"
                  onChange={handleOcrFileSelect}
                />
                <p className="ocr-dropzone-title">Drag & drop your PDF or image file here</p>
                <p className="ocr-dropzone-subtitle">or click to select from your device</p>
              </label>

              {selectedFile ? (
                <p className="ocr-selected-file">Selected: {selectedFile.name}</p>
              ) : null}

              <button
                type="submit"
                className="ocr-extract-btn"
                disabled={extracting || !selectedFile || !selectedProjectId}
              >
                {extracting ? "Extracting..." : "Extract Text"}
              </button>
            </form>
          </article>
        </div>,
        document.body
      )
    : null;

  const aiModal = isAIModalOpen
    ? createPortal(
        <div
          className="project-assign-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsAIModalOpen(false)}
        >
          <article className="project-assign-modal glass-card ai-generation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-head">
              <div className="assistant-title-wrap">
                <div>
                  <h3>Generate Content with AI</h3>
                  <p>Describe what you want AI to generate for this project</p>
                </div>
              </div>

              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setIsAIModalOpen(false);
                  setAiPrompt("");
                }}
              >
                Close
              </button>
            </div>

            <form className="stack-form" onSubmit={handleGenerateAI}>
              <label htmlFor="ai-prompt">Your Prompt</label>
              <textarea
                id="ai-prompt"
                rows="6"
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                placeholder="E.g., 'Write a detailed implementation plan for...' or 'Create a comprehensive analysis of...'"
              />

              <label htmlFor="ai-tone">Tone</label>
              <select
                id="ai-tone"
                value={aiTone}
                onChange={(event) => setAiTone(event.target.value)}
              >
                <option value="professional">Professional</option>
                <option value="technical">Technical</option>
                <option value="formal">Formal</option>
                <option value="casual">Casual</option>
              </select>

              <button
                type="submit"
                disabled={generatingAI || !aiPrompt.trim()}
              >
                {generatingAI ? "Generating..." : "Generate"}
              </button>
            </form>
          </article>
        </div>,
        document.body
      )
    : null;

  return (
    <PortalLayout
      title="Content Editor"
      subtitle="Upload, AI-generate, edit content, then submit as Word document"
    >
      {status.message ? (
        <p className={status.type === "error" ? "inline-error" : "inline-success"}>
          {status.message}
        </p>
      ) : null}

      <section className="glass-card">
        <div className="card-head">
          <h3>Project Selection</h3>
          <p>Select project before choosing input methods</p>
        </div>

        <form className="stack-form">
          <label htmlFor="draft-project-top">Project</label>
          <select
            id="draft-project-top"
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
        </form>
      </section>

      <section className="glass-card method-icon-card">
        <div className="card-head">
          <h3>Input Launchers</h3>
          <p>Pick a method to start your content flow</p>
        </div>
        <div className="method-icon-row">
          <button
            type="button"
            className={`method-circle-btn method-ocr ${activeInputMethod === "ocr" ? "active" : ""}`}
            onClick={handleOpenOcrMethod}
            aria-label="Open OCR upload"
            title="Upload file with OCR"
          >
            <span className="method-icon-glyph" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 3h7l5 5v13H7V3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M9.5 14h7M9.5 17h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <span className="method-icon-label">OCR</span>
          </button>
          <button
            type="button"
            className={`method-circle-btn method-ai ${activeInputMethod === "ai" ? "active" : ""}`}
            onClick={handleOpenAiMethod}
            aria-label="Open AI content generator"
            title="Generate content with AI"
          >
            <span className="method-icon-glyph" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M18.5 14l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="method-icon-label">AI</span>
          </button>
          <button
            type="button"
            className={`method-circle-btn method-edit ${activeInputMethod === "manual" ? "active" : ""}`}
            onClick={handleOpenManualMethod}
            aria-label="Go to manual editor"
            title="Write manually in editor"
          >
            <span className="method-icon-glyph" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 20h4l9.7-9.7a1.8 1.8 0 0 0 0-2.6l-1.4-1.4a1.8 1.8 0 0 0-2.6 0L4 16v4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M12.8 7.2l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <span className="method-icon-label">EDIT</span>
          </button>
        </div>
      </section>

      <section>
        <article className="glass-card">
          <div className="card-head">
            <h3>Editor</h3>
            <p>{selectedProject?.title || "Select a project to begin"}</p>
          </div>

          <form className="stack-form">
            <label htmlFor="draft-content">3. Manual Edit / Combine</label>
            <textarea
              id="draft-content"
              rows="10"
              value={draft.content}
              ref={manualEditorRef}
              onChange={(event) => {
                setDraft({ ...draft, content: event.target.value });
                setIsDraftDirty(true);
              }}
              placeholder="OCR text, AI content, or manually typed text will appear here. Edit before converting to Word."
              disabled={loadingDraft}
            />

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={handleConvertToWord}
                disabled={converting || loadingDraft || !draft.content.trim()}
                style={{ flex: 1, backgroundColor: wordUrl ? "#2563eb" : "#3b82f6" }}
              >
                {converting ? "Converting..." : wordUrl ? "Re-Convert Word" : "Convert to Word"}
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || submissionStatus !== "DRAFT" || !draft.content.trim() || !wordUrl}
                style={{ flex: 1, backgroundColor: submissionStatus !== "DRAFT" ? "#999" : "#059669" }}
              >
                {submitting ? "Submitting..." : submissionStatus !== "DRAFT" ? "Already Submitted" : "Submit to Admin"}
              </button>
            </div>

            {wordUrl ? (
              <a href={wordUrl} target="_blank" rel="noreferrer" className="muted-copy">
                Preview converted Word document
              </a>
            ) : (
              <p className="muted-copy">Convert to Word -&gt; Submit to Admin</p>
            )}
          </form>
        </article>
      </section>

      {ocrModal}
      {aiModal}

    </PortalLayout>
  );
};

export default ContentEditor;