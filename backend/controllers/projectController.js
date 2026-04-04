import Project from "../models/Project.js";
import User from "../models/userModel.js";
import transporter from "../config/nodemailer.js";
import createLog from "../Utils/logGenerator.js";
import buildRequestMetadata from "../Utils/requestMetadata.js";

const projectPopulate = [
  {
    path: "createdBy",
    select: "name email role",
  },
  {
    path: "assignedTo",
    select: "name email role",
  },
  {
    path: "sourceResearchId",
    select: "title status",
  },
];

export const createProject = async (req, res, next) => {
  try {
    const { title, description, requirements = "", assignedTo, status } = req.body;

    let assignedUserId = null;

    // If assignedTo looks like an email, look up the user
    if (assignedTo && assignedTo.includes("@")) {
      const normalizedEmail = String(assignedTo).trim().toLowerCase();
      const assignedUser = await User.findOne({ email: normalizedEmail });
      if (!assignedUser) {
        return res.status(404).json({ msg: "Assigned user not found" });
      }
      assignedUserId = assignedUser._id;
    } else if (assignedTo) {
      // Otherwise treat as ObjectId
      assignedUserId = assignedTo;
    }

    const project = await Project.create({
      title,
      description,
      requirements,
      createdBy: req.user._id,
      assignedTo: assignedUserId || null,
      status: status || (assignedUserId ? "ASSIGNED" : "CREATED"),
    });

    await createLog(
      req.user._id,
      "PROJECT_CREATED",
      buildRequestMetadata(req, {
        projectId: String(project._id),
        assignedTo: assignedUserId || null,
        status: project.status,
      })
    );

    const populated = await Project.findById(project._id)
      .populate(projectPopulate)
      .select("-__v");

    return res.status(201).json(populated);
  } catch (err) {
    return next(err);
  }
};

export const listProjects = async (req, res, next) => {
  try {
    const queryParams = req.validated?.query || req.query || {};
    const { status, assignedTo, search } = queryParams;

    const query = {};

    if (req.user.role !== "ADMIN") {
      query.assignedTo = req.user._id;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const projects = await Project.find(query)
      .populate(projectPopulate)
      .sort({ updatedAt: -1 })
      .select("-__v");

    return res.json(projects);
  } catch (err) {
    return next(err);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id)
      .populate(projectPopulate)
      .select("-__v");

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    const isAdmin = req.user.role === "ADMIN";
    const isCreator = String(project.createdBy?._id || project.createdBy) === String(req.user._id);
    const isAssignee = String(project.assignedTo?._id || project.assignedTo) === String(req.user._id);

    if (!isAdmin && !isCreator && !isAssignee) {
      return res.status(403).json({ msg: "Not authorized to view this project" });
    }

    return res.json(project);
  } catch (err) {
    return next(err);
  }
};

export const assignProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userEmail } = req.body;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    const normalizedEmail = String(userEmail || "").trim().toLowerCase();
    const assignedUser = await User.findOne({ email: normalizedEmail }).select("name email role isVerified");

    if (!assignedUser) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (!assignedUser.isVerified) {
      return res.status(400).json({ msg: "User account is not verified" });
    }

    const previousAssignment = {
      assignedTo: project.assignedTo,
      status: project.status,
    };

    project.assignedTo = assignedUser._id;
    project.status = "ASSIGNED";
    await project.save();

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
    const projectUrl = `${frontendUrl}/projects/${project._id}`;

    try {
      await transporter.sendMail({
        to: assignedUser.email,
        subject: "Project Assigned",
        text: [
          `You have been assigned to the project: ${project.title}`,
          "",
          `Description: ${project.description}`,
          `Project: ${projectUrl}`,
        ].join("\n"),
      });
    } catch (err) {
      project.assignedTo = previousAssignment.assignedTo;
      project.status = previousAssignment.status;
      await project.save();

      return res.status(502).json({
        msg: "Unable to send assignment email right now. Please retry.",
      });
    }

    await createLog(
      req.user._id,
      "PROJECT_ASSIGNED",
      buildRequestMetadata(req, {
        projectId: String(project._id),
        assignedTo: String(assignedUser._id),
        assignedEmail: assignedUser.email,
        previousStatus: previousAssignment.status,
        nextStatus: project.status,
      })
    );

    await createLog(
      req.user._id,
      "INVITE_SENT",
      buildRequestMetadata(req, {
        projectId: String(project._id),
        recipientUserId: String(assignedUser._id),
        recipientEmail: assignedUser.email,
        purpose: "PROJECT_ASSIGNMENT",
      })
    );

    const populated = await Project.findById(project._id)
      .populate(projectPopulate)
      .select("-__v");

    return res.json(populated);
  } catch (err) {
    return next(err);
  }
};

export const acceptProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    if (!project.assignedTo) {
      return res.status(400).json({ msg: "Project is not assigned to any user" });
    }

    const isAssignee = String(project.assignedTo) === String(req.user._id);

    if (!isAssignee) {
      return res.status(403).json({ msg: "Only assigned user can accept this project" });
    }

    const previousStatus = project.status;
    project.status = "IN_PROGRESS";
    await project.save();

    if (previousStatus !== "IN_PROGRESS") {
      await createLog(
        req.user._id,
        "PROJECT_ACCEPTED",
        buildRequestMetadata(req, {
          projectId: String(project._id),
          previousStatus,
          nextStatus: project.status,
        })
      );
    }

    const populated = await Project.findById(project._id)
      .populate(projectPopulate)
      .select("-__v");

    return res.json(populated);
  } catch (err) {
    return next(err);
  }
};

export const rejectProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    if (!project.assignedTo) {
      return res.status(400).json({ msg: "Project is not assigned to any user" });
    }

    const isAssignee = String(project.assignedTo) === String(req.user._id);

    if (!isAssignee) {
      return res.status(403).json({ msg: "Only assigned user can reject this project" });
    }

    const previousStatus = project.status;
    const previousAssignee = project.assignedTo;

    if (!["ASSIGNED", "IN_PROGRESS"].includes(previousStatus)) {
      return res.status(400).json({
        msg: `Project cannot be rejected in current status: ${previousStatus}`,
      });
    }

    // Clear assignee on rejection so admin can reassign to a different user.
    project.status = "REJECTED";
    project.assignedTo = null;
    await project.save();

    await createLog(
      req.user._id,
      "PROJECT_REJECTED_BY_USER",
      buildRequestMetadata(req, {
        projectId: String(project._id),
        previousStatus,
        nextStatus: project.status,
        previousAssignee: String(previousAssignee),
      })
    );

    const populated = await Project.findById(project._id)
      .populate(projectPopulate)
      .select("-__v");

    return res.json(populated);
  } catch (err) {
    return next(err);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    const projectTitle = project.title;
    const deleted = await Project.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(500).json({ msg: "Failed to delete project" });
    }

    await createLog(
      req.user._id,
      "PROJECT_DELETED",
      buildRequestMetadata(req, {
        projectId: String(project._id),
        title: projectTitle,
      })
    );

    return res.json({ msg: "Project deleted successfully", projectId: id });
  } catch (err) {
    return next(err);
  }
};
