import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import API from "../../api/axios";
import PortalLayout from "../../components/PortalLayout";

const statusOptions = ["DRAFT", "SELECTED", "DISCARDED"];

const emptyManualForm = {
  title: "",
  description: "",
  tags: "",
};

const parseTags = (raw) =>
  String(raw || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const BotAvatar = () => (
  <div className="bot-avatar" aria-hidden="true">
    <span className="bot-icon">AI</span>
  </div>
);

const ProjectResearch = () => {
  const [items, setItems] = useState([]);
  const [manualForm, setManualForm] = useState(emptyManualForm);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: "welcome",
      type: "bot",
      text: "Hi, I am your AI research assistant. Fill topic, keywords, and count in the assistant card, then open me to generate ideas.",
    },
  ]);
  const [aiTopic, setAiTopic] = useState("");
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [currentIdeas, setCurrentIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const chatEndRef = useRef(null);

  const draftCount = useMemo(
    () => items.filter((item) => item.status === "DRAFT").length,
    [items]
  );

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, currentIdeas]);

  const fetchItems = async () => {
    setLoading(true);

    try {
      const response = await API.get("/research");
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to fetch research items",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleManualCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      await API.post("/research", {
        title: manualForm.title,
        description: manualForm.description,
        tags: parseTags(manualForm.tags),
      });

      setManualForm(emptyManualForm);
      await fetchItems();
      setStatus({ type: "success", message: "Research item created" });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Could not create research item",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!aiTopic && !aiKeywords) {
      setStatus({
        type: "error",
        message: "Please provide a topic or at least one keyword",
      });
      return;
    }

    const userMessage = {
      id: Date.now(),
      type: "user",
      text: `Topic: ${aiTopic || "-"} | Keywords: ${aiKeywords || "-"} | Count: ${aiCount}`,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      const keywordTags = parseTags(aiKeywords);

      const response = await API.post("/research/ai-generate", {
        topic: aiTopic,
        keywords: keywordTags,
        count: Number(aiCount) || 5,
      });

      const ideas = Array.isArray(response.data?.ideas)
        ? response.data.ideas.map((idea, index) => ({
            ...idea,
            _ideaId: `${Date.now()}-${index}`,
            _tags: keywordTags,
          }))
        : [];

      setCurrentIdeas(ideas);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-bot`,
          type: "bot",
          text: `Generated ${ideas.length} ideas. Confirm any idea to save it into Research Backlog.`,
        },
      ]);
      setStatus({ type: "success", message: "AI ideas generated" });
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          type: "bot-error",
          text: err?.response?.data?.msg || "AI generation failed. Please try again.",
        },
      ]);
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "AI generation failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const saveIdeaAsResearch = async (idea) => {
    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      await API.post("/research", {
        title: idea.title,
        description: idea.description,
        tags: Array.isArray(idea._tags) ? idea._tags : [],
      });

      await fetchItems();
      setCurrentIdeas((prev) => prev.filter((entry) => entry._ideaId !== idea._ideaId));
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-saved`,
          type: "bot",
          text: `Saved: ${idea.title}`,
        },
      ]);
      setStatus({ type: "success", message: "Idea saved to research backlog" });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to save generated idea",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateResearchStatus = async (id, nextStatus) => {
    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      await API.patch(`/research/${id}`, { status: nextStatus });
      await fetchItems();
      setStatus({ type: "success", message: `Research marked as ${nextStatus}` });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to update research status",
      });
    } finally {
      setSaving(false);
    }
  };

  const convertToProject = async (id) => {
    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      await API.post(`/research/${id}/convert-to-project`, {});
      await fetchItems();
      setStatus({ type: "success", message: "Research converted to project" });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Conversion failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteResearchItem = async (id, title) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setSaving(true);
    setStatus({ type: "", message: "" });

    try {
      await API.delete(`/research/${id}`);
      await fetchItems();
      setStatus({ type: "success", message: "Research item deleted successfully" });
    } catch (err) {
      setStatus({
        type: "error",
        message: err?.response?.data?.msg || "Failed to delete research item",
      });
    } finally {
      setSaving(false);
    }
  };

  const assistantModal = assistantOpen
    ? createPortal(
        <div className="assistant-modal-overlay" role="dialog" aria-modal="true">
          <div className="assistant-modal glass-card">
            <div className="assistant-modal-head">
              <div className="assistant-title-wrap">
                <BotAvatar />
                <div>
                  <h3>AI Research Assistant</h3>
                  <p>Generate and confirm ideas to save in backlog</p>
                </div>
              </div>

              <button
                type="button"
                className="ghost-btn"
                onClick={() => setAssistantOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="chat-container">
              <div className="chat-messages">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-message chat-message-${message.type}`}
                  >
                    {message.type.startsWith("bot") ? <BotAvatar /> : null}
                    <div className="message-content">
                      <p>{message.text}</p>
                    </div>
                  </div>
                ))}

                {currentIdeas.length > 0 ? (
                  <div className="chat-ideas-container">
                    {currentIdeas.map((idea, index) => (
                      <div key={idea._ideaId || `${idea.title}-${index}`} className="chat-idea-card">
                        <div className="idea-header">
                          <span className="idea-number">{String(index + 1).padStart(2, "0")}</span>
                          <h4>{idea.title}</h4>
                        </div>
                        <p className="idea-description">{idea.description}</p>
                        <div className="idea-actions">
                          <button
                            type="button"
                            className="btn-approve"
                            onClick={() => saveIdeaAsResearch(idea)}
                            disabled={saving}
                          >
                            {saving ? "Saving..." : "Confirm Idea"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted-copy">No generated ideas yet. Click Generate Ideas.</p>
                )}

                <div ref={chatEndRef} />
              </div>
            </div>

            <div className="assistant-modal-actions">
              <button
                type="button"
                className="btn-send"
                onClick={handleGenerate}
                disabled={saving}
              >
                {saving ? "Generating..." : "Generate Ideas"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <PortalLayout
      title="Project Research"
      subtitle="Stage and curate project ideas before formal creation"
    >
      {status.message ? (
        <p className={status.type === "error" ? "inline-error" : "inline-success"}>
          {status.message}
        </p>
      ) : null}

      <section className="stats-grid compact-grid">
        <article className="metric-card accent-cyan">
          <p>Total Ideas</p>
          <h3>{items.length}</h3>
          <span>Research backlog</span>
        </article>
        <article className="metric-card accent-indigo">
          <p>Draft</p>
          <h3>{draftCount}</h3>
          <span>Ready for review</span>
        </article>
        <article className="metric-card accent-emerald">
          <p>Generated</p>
          <h3>{currentIdeas.length}</h3>
          <span>From AI assistant</span>
        </article>
      </section>

      <div className="assistant-anchor">
        <section className="glass-card ai-assistant-strip">
          <div className="card-head">
            <h3>AI Research Assistant</h3>
            <p>Set prompt inputs, then launch the assistant popup</p>
          </div>

          <div className="assistant-strip-grid">
          <div className="assistant-cell">
            <label htmlFor="ai-topic" className="chat-label">Topic</label>
            <input
              id="ai-topic"
              className="chat-input"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="e.g., video authenticity pipeline"
            />
          </div>

          <div className="assistant-cell">
            <label htmlFor="ai-keywords" className="chat-label">Keywords</label>
            <input
              id="ai-keywords"
              className="chat-input"
              value={aiKeywords}
              onChange={(e) => setAiKeywords(e.target.value)}
              placeholder="ai, youtube, fake, original label"
            />
          </div>

          <div className="assistant-cell">
            <label htmlFor="ai-count" className="chat-label">Count</label>
            <select
              id="ai-count"
              className="chat-input"
              value={aiCount}
              onChange={(e) => setAiCount(Number(e.target.value))}
            >
              {[3, 4, 5, 6, 7, 8].map((value) => (
                <option key={value} value={value}>
                  {value} ideas
                </option>
              ))}
            </select>
          </div>

          <div className="assistant-cell assistant-cell-launch">
            <label className="chat-label">Assistant</label>
            <div className="assistant-launch-wrap">
              <button
                type="button"
                className="assistant-launch-btn"
                onClick={() => setAssistantOpen(true)}
                aria-label="Open AI Assistant popup"
              >
                <span className="assistant-launch-icon">Open AI Assistant</span>
              </button>
            </div>
          </div>
          </div>
        </section>

      </div>

      {assistantModal}

      <section className="glass-card research-form-card">
        <div className="card-head research-form-head">
          <h3>Create Research Item</h3>
          <p>Manual staging for project discovery</p>
        </div>

        <form className="research-manual-form" onSubmit={handleManualCreate}>
          <div className="field-block">
            <label htmlFor="research-title">Title</label>
            <input
              id="research-title"
              value={manualForm.title}
              onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
              placeholder="AI-based compliance workflow"
              required
            />
          </div>

          <div className="field-block">
            <label htmlFor="research-tags">Tags (comma-separated)</label>
            <input
              id="research-tags"
              value={manualForm.tags}
              onChange={(e) => setManualForm({ ...manualForm, tags: e.target.value })}
              placeholder="ai, compliance, workflow"
            />
          </div>

          <div className="field-block field-span-2">
            <label htmlFor="research-description">Description</label>
            <textarea
              id="research-description"
              rows="4"
              value={manualForm.description}
              onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
              placeholder="Describe value, scope, and expected output"
              required
            />
          </div>

          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Create research item"}
          </button>
        </form>
      </section>

      <section className="glass-card">
        <div className="card-head">
          <h3>Research Backlog</h3>
          <p>{loading ? "Loading ideas..." : `${items.length} items`}</p>
        </div>

        <div className="table-wrap">
          <table className="log-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Tags</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan="4" className="table-empty">
                    No research items yet.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <Fragment key={item._id}>
                    <tr>
                      <td>
                        <strong>{item.title}</strong>
                        <p className="muted-copy">{item.description}</p>
                      </td>
                      <td>{item.status}</td>
                      <td>{Array.isArray(item.tags) ? item.tags.join(", ") : "-"}</td>
                      <td>{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>

                    <tr>
                      <td colSpan="4">
                        <div className="research-action-row">
                          {statusOptions
                            .filter((value) => value !== item.status)
                            .map((value) => (
                              <button
                                key={value}
                                type="button"
                                className="ghost-btn"
                                onClick={() => updateResearchStatus(item._id, value)}
                              >
                                {value}
                              </button>
                            ))}
                          <button
                            type="button"
                            className="ghost-btn"
                            onClick={() => convertToProject(item._id)}
                          >
                            Convert
                          </button>
                          <button
                            type="button"
                            className="ghost-btn"
                            style={{ color: "#ef4444" }}
                            onClick={() => handleDeleteResearchItem(item._id, item.title)}
                            disabled={saving}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

    </PortalLayout>
  );
};

export default ProjectResearch;
