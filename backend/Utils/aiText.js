const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const cleanText = (value, fallback = "") =>
  String(value || fallback)
    .trim()
    .replace(/\s+/g, " ");

const toWordBounded = (value, maxWords = 250) => {
  const words = cleanText(value).split(" ").filter(Boolean);
  return words.slice(0, maxWords).join(" ");
};

const callOpenAI = async ({ systemPrompt, userPrompt, temperature = 0.7 }) => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return "";
  }

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      return "";
    }

    const body = await response.json();
    return cleanText(body?.choices?.[0]?.message?.content || "");
  } catch {
    return "";
  }
};

export const generateProjectDescriptionText = async ({
  title,
  requirements,
  domain,
}) => {
  const safeTitle = cleanText(title, "Untitled Project");
  const safeRequirements = cleanText(requirements, "No strict requirements provided.");
  const safeDomain = cleanText(domain, "General workflow automation");

  const systemPrompt =
    "You generate concise and practical project descriptions. Return plain text only.";

  const userPrompt = [
    "Generate a single project description paragraph.",
    `Title: ${safeTitle}`,
    `Domain: ${safeDomain}`,
    `Requirements: ${safeRequirements}`,
    "Keep it clear, implementation-oriented, and under 180 words.",
    "Do not use markdown.",
  ].join("\n");

  const aiText = await callOpenAI({ systemPrompt, userPrompt, temperature: 0.65 });

  if (aiText) {
    return toWordBounded(aiText, 180);
  }

  return toWordBounded(
    `${safeTitle} is a ${safeDomain.toLowerCase()} initiative focused on delivering measurable outcomes with a reliable execution flow. The project will implement a structured lifecycle from intake and planning to delivery and review, while ensuring traceability and accountability across each milestone. Key requirements include ${safeRequirements.toLowerCase()} with clear acceptance criteria, stakeholder visibility, and quality controls. The expected result is a scalable and maintainable solution that improves team productivity and reduces operational risk.`,
    180
  );
};

export const generateContentText = async ({
  projectTitle,
  projectDescription,
  prompt,
  tone,
}) => {
  const safeTitle = cleanText(projectTitle, "Project");
  const safeDescription = cleanText(projectDescription, "No additional project description provided.");
  const safePrompt = cleanText(prompt, "Create a draft content submission.");
  const safeTone = cleanText(tone, "professional");

  const systemPrompt =
    "You generate concise project delivery content. Return plain text only with no markdown.";

  const userPrompt = [
    "Generate draft content for a project submission.",
    `Project Title: ${safeTitle}`,
    `Project Description: ${safeDescription}`,
    `User Prompt: ${safePrompt}`,
    `Tone: ${safeTone}`,
    "Keep it actionable and under 260 words.",
  ].join("\n");

  const aiText = await callOpenAI({ systemPrompt, userPrompt, temperature: 0.7 });

  if (aiText) {
    return toWordBounded(aiText, 260);
  }

  return toWordBounded(
    `For ${safeTitle}, this draft content outlines the delivery approach in a ${safeTone.toLowerCase()} style. ${safeDescription} The execution plan starts with requirement alignment, then breaks work into measurable milestones, assigns ownership, and tracks progress with periodic validations. ${safePrompt} The submission includes expected outcomes, key dependencies, and risk controls so stakeholders can review progress confidently. Final delivery will include completion evidence, quality checks, and next-step recommendations to support adoption and continuous improvement.`,
    260
  );
};