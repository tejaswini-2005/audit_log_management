import createLog from "../Utils/logGenerator.js";
import buildRequestMetadata from "../Utils/requestMetadata.js";
import {
  generateContentText,
  generateProjectDescriptionText,
} from "../Utils/aiText.js";

export const generateProjectDescription = async (req, res, next) => {
  try {
    const { title, requirements, domain } = req.body;

    const text = await generateProjectDescriptionText({
      title,
      requirements,
      domain,
    });

    try {
      await createLog(
        req.user._id,
        "AI_USED_FOR_PROJECT_CREATION",
        buildRequestMetadata(req, {
          title: title || null,
          domain: domain || null,
          generatedLength: text.length,
        })
      );
    } catch (logErr) {
      console.error("Failed to write AI project creation audit log:", logErr);
    }

    return res.json({ text });
  } catch (err) {
    return next(err);
  }
};

export const generateContent = async (req, res, next) => {
  try {
    const { projectTitle, projectDescription, prompt, tone } = req.body;

    const text = await generateContentText({
      projectTitle,
      projectDescription,
      prompt,
      tone,
    });

    try {
      await createLog(
        req.user._id,
        "AI_USED_FOR_CONTENT",
        buildRequestMetadata(req, {
          projectTitle: projectTitle || null,
          tone: tone || null,
          generatedLength: text.length,
        })
      );
    } catch (logErr) {
      console.error("Failed to write AI content audit log:", logErr);
    }

    return res.json({ text });
  } catch (err) {
    return next(err);
  }
};