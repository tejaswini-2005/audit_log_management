import Project from "../models/Project.js";
import ResearchItem from "../models/ResearchItem.js";
import createLog from "../Utils/logGenerator.js";
import buildRequestMetadata from "../Utils/requestMetadata.js";
import { generateResearchIdeas } from "../Utils/aiResearch.js";

const populateFields = "createdBy assignedTo";
const populateSelect = "name email role";

const normalizeTags = (tags = []) => {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [...new Set(tags.map((tag) => String(tag || "").trim()).filter(Boolean))].slice(0, 12);
};

export const createResearchItem = async (req, res, next) => {
  try {
    const { title, description, status, tags } = req.body;

    const researchItem = await ResearchItem.create({
      title,
      description,
      tags: normalizeTags(tags),
      status: status || "DRAFT",
      createdBy: req.user._id,
    });

    await createLog(
      req.user._id,
      "PROJECT_RESEARCH_CREATED",
      buildRequestMetadata(req, {
        researchId: String(researchItem._id),
        status: researchItem.status,
        title,
      })
    );

    return res.status(201).json(researchItem);
  } catch (err) {
    return next(err);
  }
};

export const generateResearchWithAI = async (req, res, next) => {
  try {
    const { topic, keywords = [], count = 5 } = req.body;

    const ideas = await generateResearchIdeas({ topic, keywords, count });

    await createLog(
      req.user._id,
      "AI_USED_FOR_RESEARCH",
      buildRequestMetadata(req, {
        topic: topic || null,
        keywords,
        generatedIdeas: ideas.length,
      })
    );

    return res.json({ ideas });
  } catch (err) {
    return next(err);
  }
};

export const getResearchItems = async (req, res, next) => {
  try {
    const { status, search } = req.validated?.query || req.query || {};
    const query = {};

    if (status) {
      query.status = status;
    } else {
      // Exclude converted items (SELECTED status) from backlog by default
      query.status = { $ne: "SELECTED" };
    }

    if (search) {
      query.$text = { $search: search };
    }

    const items = await ResearchItem.find(query)
      .populate("createdBy", populateSelect)
      .sort({ createdAt: -1 })
      .select("-__v");

    return res.json(items);
  } catch (err) {
    return next(err);
  }
};

export const updateResearchItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    if (updates.tags) {
      updates.tags = normalizeTags(updates.tags);
    }

    const existing = await ResearchItem.findById(id);

    if (!existing) {
      return res.status(404).json({ msg: "Research item not found" });
    }

    const previousStatus = existing.status;

    Object.assign(existing, updates);
    await existing.save();

    if (previousStatus !== "SELECTED" && existing.status === "SELECTED") {
      await createLog(
        req.user._id,
        "PROJECT_RESEARCH_SELECTED",
        buildRequestMetadata(req, {
          researchId: String(existing._id),
          previousStatus,
          nextStatus: existing.status,
        })
      );
    }

    return res.json(existing);
  } catch (err) {
    return next(err);
  }
};

export const convertResearchToProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { requirements = "", assignedTo } = req.body;

    const researchItem = await ResearchItem.findById(id);

    if (!researchItem) {
      return res.status(404).json({ msg: "Research item not found" });
    }

    const nextStatus = assignedTo ? "ASSIGNED" : "CREATED";

    const project = await Project.create({
      title: researchItem.title,
      description: researchItem.description,
      requirements,
      createdBy: req.user._id,
      assignedTo: assignedTo || null,
      status: nextStatus,
      sourceResearchId: researchItem._id,
    });

    const previousStatus = researchItem.status;
    researchItem.status = "SELECTED";
    await researchItem.save();

    if (previousStatus !== "SELECTED") {
      await createLog(
        req.user._id,
        "PROJECT_RESEARCH_SELECTED",
        buildRequestMetadata(req, {
          researchId: String(researchItem._id),
          previousStatus,
          nextStatus: "SELECTED",
        })
      );
    }

    await createLog(
      req.user._id,
      "PROJECT_CREATED",
      buildRequestMetadata(req, {
        projectId: String(project._id),
        source: "RESEARCH_ITEM",
      })
    );

    await createLog(
      req.user._id,
      "PROJECT_CREATED_FROM_RESEARCH",
      buildRequestMetadata(req, {
        researchId: String(researchItem._id),
        projectId: String(project._id),
      })
    );

    const populated = await Project.findById(project._id)
      .populate(populateFields, populateSelect)
      .select("-__v");

    return res.status(201).json(populated);
  } catch (err) {
    return next(err);
  }
};

export const deleteResearchItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const researchItem = await ResearchItem.findById(id);

    if (!researchItem) {
      return res.status(404).json({ msg: "Research item not found" });
    }

    const itemTitle = researchItem.title;
    const deleted = await ResearchItem.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(500).json({ msg: "Failed to delete research item" });
    }

    await createLog(
      req.user._id,
      "PROJECT_RESEARCH_DELETED",
      buildRequestMetadata(req, {
        researchId: String(researchItem._id),
        title: itemTitle,
      })
    );

    return res.json({ msg: "Research item deleted successfully", researchId: id });
  } catch (err) {
    return next(err);
  }
};
