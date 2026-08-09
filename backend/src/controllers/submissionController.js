import Project from "../models/Project.js";
import Submission from "../models/Submission.js";
import createLog from "../Utils/logGenerator.js";
import buildRequestMetadata from "../Utils/requestMetadata.js";
import { generateWord } from "../Utils/documentGenerator.js";
import transporter from "../config/nodemailer.js";
import User from "../models/userModel.js";

export const createOrUpdateDraftSubmission = async (req, res, next) => {
  try {
    const { projectId, content, fileUrl = "" } = req.body;

    if (req.user.role === "ADMIN") {
      return res.status(403).json({ msg: "Content draft is for users only" });
    }

    const project = await Project.findById(projectId).select("assignedTo createdBy");

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    const isAdmin = req.user.role === "ADMIN";
    const isAssignee = String(project.assignedTo || "") === String(req.user._id);

    if (!isAdmin && !isAssignee) {
      return res.status(403).json({ msg: "Only assigned user can edit content" });
    }

    let submission = await Submission.findOne({
      projectId,
      userId: req.user._id,
    });

    const isNew = !submission;

    if (!submission) {
      submission = new Submission({
        projectId,
        userId: req.user._id,
      });
    }

    submission.content = content;
    submission.fileUrl = fileUrl;
    // Regenerate documents from the latest content only.
    submission.fileUrlPDF = "";
    submission.fileUrlWord = "";
    submission.status = "DRAFT";

    await submission.save();

    await createLog(
      req.user._id,
      "CONTENT_EDITED",
      buildRequestMetadata(req, {
        projectId: String(projectId),
        submissionId: String(submission._id),
        mode: isNew ? "CREATE_DRAFT" : "UPDATE_DRAFT",
        status: submission.status,
      })
    );

    const populated = await Submission.findById(submission._id)
      .populate("projectId", "title status")
      .populate("userId", "name email role")
      .select("-__v");

    return res.status(isNew ? 201 : 200).json(populated);
  } catch (err) {
    return next(err);
  }
};

export const getSubmissionsByProject = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    if (req.user.role === "ADMIN") {
      return res.status(403).json({ msg: "Content draft is for users only" });
    }

    const project = await Project.findById(projectId).select("assignedTo createdBy");

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    const isAssignee = String(project.assignedTo || "") === String(req.user._id);
    const isCreator = String(project.createdBy || "") === String(req.user._id);

    if (!isAssignee && !isCreator) {
      return res.status(403).json({ msg: "Not authorized to view submissions for this project" });
    }

    const query = { projectId };

    if (!isCreator) {
      query.userId = req.user._id;
    }

    const submissions = await Submission.find(query)
      .populate("projectId", "title status")
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .select("-__v");

    return res.json(submissions);
  } catch (err) {
    return next(err);
  }
};

export const submitSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user._id;

    // Fetch submission with project info
    const submission = await Submission.findById(submissionId)
      .populate("projectId", "title status assignedTo createdBy")
      .populate("userId", "name email")
      .select("-__v");

    if (!submission) {
      return res.status(404).json({ msg: "Submission not found" });
    }

    // Verify ownership - only the user who created the submission can submit it
    if (String(submission.userId._id) !== String(userId)) {
      return res.status(403).json({ msg: "Not authorized to submit this submission" });
    }

    // Check that content exists
    const hasContent = submission.content && submission.content.trim().length > 0;

    if (!hasContent) {
      return res.status(400).json({
        msg: "Cannot submit: no content exists. Please add content before submitting.",
      });
    }

    if (!submission.fileUrlWord) {
      return res.status(400).json({
        msg: "Please convert the content to Word before submitting to admin.",
      });
    }

    // Update submission status to SUBMITTED
    submission.status = "SUBMITTED";
    await submission.save();

    // Keep project progress in sync with submission workflow
    await Project.findByIdAndUpdate(submission.projectId._id, {
      status: "SUBMITTED",
    });

    // Get admin users to notify
    let admins = [];
    try {
      admins = await User.find({ role: "ADMIN" }).select("email name");
    } catch (adminErr) {
      console.error("Error fetching admins:", adminErr.message);
    }

    // Send email notification to admins
    if (admins.length > 0) {
      const adminEmails = admins.map((admin) => admin.email).join(", ");
      const submittedDate = new Date(submission.updatedAt).toLocaleDateString();

      const emailHtml = `
        <h2>New Submission Received</h2>
        <p>A new submission has been submitted and is awaiting your review.</p>
        <div style="margin: 20px 0; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
          <p><strong>Project:</strong> ${submission.projectId.title}</p>
          <p><strong>Submitted By:</strong> ${submission.userId.name} (${submission.userId.email})</p>
          <p><strong>Submitted Date:</strong> ${submittedDate}</p>
          <p><strong>Document:</strong> <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}/admin/submissions">View Submission</a></p>
        </div>
        <p>Please review the submission and take appropriate action.</p>
      `;

      try {
        await transporter.sendMail({
          from: process.env.MAIL_FROM || "noreply@system.com",
          to: adminEmails,
          subject: `New Submission: ${submission.projectId.title} - ${submission.userId.name}`,
          html: emailHtml,
        });
      } catch (mailErr) {
        console.error("Error sending notification email:", mailErr.message);
        // Don't fail the submission if email fails
      }
    }

    // Create audit log
    await createLog(
      userId,
      "DOCUMENT_SUBMITTED",
      buildRequestMetadata(req, {
        submissionId: String(submission._id),
        projectId: String(submission.projectId._id),
        projectTitle: submission.projectId.title,
        status: submission.status,
        hasContent,
        hasWordFile: Boolean(submission.fileUrlWord),
        adminNotified: admins.length > 0,
      })
    );

    const populated = await Submission.findById(submission._id)
      .populate("projectId", "title status")
      .populate("userId", "name email role")
      .select("-__v");

    return res.status(200).json({
      msg: "Submission successfully submitted to admin",
      submission: populated,
    });
  } catch (err) {
    return next(err);
  }
};

export const convertSubmissionToWord = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user._id;

    const submission = await Submission.findById(submissionId)
      .populate("projectId", "title status assignedTo createdBy")
      .select("-__v");

    if (!submission) {
      return res.status(404).json({ msg: "Submission not found" });
    }

    if (String(submission.userId) !== String(userId)) {
      return res.status(403).json({ msg: "Not authorized to convert this submission" });
    }

    const hasContent = submission.content && submission.content.trim().length > 0;
    if (!hasContent) {
      return res.status(400).json({
        msg: "Cannot convert to Word: submission content is empty.",
      });
    }

    try {
      const projectTitle = submission.projectId?.title || "document";
      const wordResult = await generateWord(submission.content, projectTitle);
      submission.fileUrlWord = `/documents/${wordResult.fileName}`;
      submission.status = "DRAFT";
      await submission.save();
    } catch (docErr) {
      console.error("Error generating Word document:", docErr.message);
      return res.status(500).json({
        msg: `Failed to convert to Word: ${docErr.message}`,
      });
    }

    await createLog(
      userId,
      "DOCUMENT_CONVERTED_TO_WORD",
      buildRequestMetadata(req, {
        submissionId: String(submission._id),
        projectId: String(submission.projectId?._id || ""),
        projectTitle: submission.projectId?.title || null,
        fileUrlWord: submission.fileUrlWord,
      })
    );

    const populated = await Submission.findById(submission._id)
      .populate("projectId", "title status")
      .populate("userId", "name email role")
      .select("-__v");

    return res.status(200).json({
      msg: "Content successfully converted to Word",
      submission: populated,
    });
  } catch (err) {
    return next(err);
  }
};

export const reviewSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { status, feedback = "" } = req.body;
    const userId = req.user._id;

    // Only admins can review submissions
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ msg: "Only admins can review submissions" });
    }

    // Fetch submission with project info
    const submission = await Submission.findById(submissionId)
      .populate("projectId", "title status")
      .populate("userId", "name email role")
      .select("-__v");

    if (!submission) {
      return res.status(404).json({ msg: "Submission not found" });
    }

    // Validate status value
    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ msg: "Status must be APPROVED or REJECTED" });
    }

    // Check if submission is in SUBMITTED state before review
    if (submission.status !== "SUBMITTED") {
      return res.status(400).json({
        msg: `Cannot review submission with status: ${submission.status}. Only SUBMITTED submissions can be reviewed.`,
      });
    }

    // Update submission status
    submission.status = status;
    await submission.save();

    // Update linked project status so admin progress UI reflects approved/rejected state
    const nextProjectStatus = status === "APPROVED" ? "APPROVED" : "REJECTED";
    await Project.findByIdAndUpdate(submission.projectId._id, {
      status: nextProjectStatus,
    });

    // Create audit logs
    const baseMetadata = {
      submissionId: String(submission._id),
      projectId: String(submission.projectId._id),
      projectTitle: submission.projectId.title,
      userId: String(submission.userId._id),
      userName: submission.userId.name,
      previousStatus: "SUBMITTED",
      newStatus: status,
      projectStatus: nextProjectStatus,
      feedback: feedback.trim(),
    };

    // Always log the review action
    await createLog(
      userId,
      "DOCUMENT_REVIEWED",
      buildRequestMetadata(req, baseMetadata)
    );

    // Also log the specific approval/rejection action
    const specificAction = status === "APPROVED" ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED";
    await createLog(
      userId,
      specificAction,
      buildRequestMetadata(req, baseMetadata)
    );

    const updated = await Submission.findById(submission._id)
      .populate("projectId", "title status")
      .populate("userId", "name email role")
      .select("-__v");

    return res.status(200).json({
      msg: `Submission successfully ${status === "APPROVED" ? "approved" : "rejected"}`,
      submission: updated,
    });
  } catch (err) {
    return next(err);
  }
};

export const getAllSubmissions = async (req, res, next) => {
  try {
    // Only admins can view all submissions
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ msg: "Only admins can view all submissions" });
    }

    // Optional query filters
    const { status: statusFilter, projectId, userId } = req.query;
    const query = {};

    if (statusFilter && ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"].includes(statusFilter)) {
      query.status = statusFilter;
    }

    if (projectId) {
      query.projectId = projectId;
    }

    if (userId) {
      query.userId = userId;
    }

    const submissions = await Submission.find(query)
      .populate("projectId", "title status assignedTo createdBy")
      .populate("userId", "name email role")
      .sort({ updatedAt: -1, createdAt: -1 })
      .select("-__v");

    return res.status(200).json({
      count: submissions.length,
      submissions,
    });
  } catch (err) {
    return next(err);
  }
};