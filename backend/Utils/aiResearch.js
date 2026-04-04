const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const cleanText = (value, fallback = "") =>
  String(value || fallback)
    .trim()
    .replace(/\s+/g, " ");

const normalizeKeywords = (keywords) => {
  if (!Array.isArray(keywords)) {
    return [];
  }

  return keywords
    .map((value) => cleanText(value))
    .filter(Boolean)
    .slice(0, 8);
};

const fallbackIdeas = ({ topic, keywords, count }) => {
  const focus = cleanText(topic, "Workflow Automation");
  const keywordText = keywords.length > 0 ? keywords.join(", ") : "compliance, delivery";

  const templates = [
    {
      title: `${focus} Intake and Prioritization Engine`,
      description: `Build a configurable intake flow that scores incoming requests using ${keywordText}, then routes items by urgency and impact.`
    },
    {
      title: `${focus} Document Intelligence Workspace`,
      description: `Create a workspace that ingests project documents, summarizes requirements, and flags missing approvals before work starts.`
    },
    {
      title: `${focus} Audit-Ready Delivery Tracker`,
      description: `Design a project tracker with milestone-level evidence capture, immutable audit events, and executive-ready progress dashboards.`
    },
    {
      title: `${focus} Risk and Controls Analyzer`,
      description: `Generate a module that maps project requirements to controls, detects delivery risk trends, and recommends mitigations.`
    },
    {
      title: `${focus} Stakeholder Reporting Assistant`,
      description: `Implement an assistant that converts project updates into tailored reports for delivery teams, compliance, and leadership.`
    },
  ];

  return templates.slice(0, count);
};

const parseJsonIdeas = (payload) => {
  if (!payload || typeof payload !== "string") {
    return [];
  }

  const trimmed = payload.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => ({
        title: cleanText(item?.title),
        description: cleanText(item?.description),
      }))
      .filter((item) => item.title && item.description);
  } catch {
    return [];
  }
};

export const generateResearchIdeas = async ({ topic, keywords = [], count = 5 }) => {
  const normalizedTopic = cleanText(topic, "Project Workflow");
  const normalizedKeywords = normalizeKeywords(keywords);
  const normalizedCount = Math.min(Math.max(Number(count) || 5, 1), 10);

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackIdeas({
      topic: normalizedTopic,
      keywords: normalizedKeywords,
      count: normalizedCount,
    });
  }

  try {
    const prompt = [
      "Generate practical project ideas.",
      `Topic: ${normalizedTopic}`,
      `Keywords: ${normalizedKeywords.join(", ") || "none provided"}`,
      `Return exactly ${normalizedCount} ideas as a raw JSON array with this shape:`,
      '[{"title":"...","description":"..."}]',
      "Do not include markdown or extra keys.",
    ].join("\n");

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "You generate concise software project ideas and always return valid JSON when requested.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed with status ${response.status}`);
    }

    const body = await response.json();
    const content = body?.choices?.[0]?.message?.content || "";
    const ideas = parseJsonIdeas(content);

    if (ideas.length > 0) {
      return ideas.slice(0, normalizedCount);
    }
  } catch {
    // Fall back to deterministic local generation when remote AI is unavailable.
  }

  return fallbackIdeas({
    topic: normalizedTopic,
    keywords: normalizedKeywords,
    count: normalizedCount,
  });
};
