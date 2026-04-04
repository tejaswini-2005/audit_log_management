import Project from "../models/Project.js";
import Submission from "../models/Submission.js";
import createLog from "../Utils/logGenerator.js";
import buildRequestMetadata from "../Utils/requestMetadata.js";
import { extractOcrText } from "../Utils/ocrText.js";

export const extractTextFromUpload = async (req, res, next) => {
  try {
    const { projectId } = req.body;

    if (req.user.role === "ADMIN") {
      return res.status(403).json({ msg: "OCR content draft is for users only" });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ msg: "File upload is required" });
    }

    console.log(`OCR request received - File: ${req.file.originalname}, Type: ${req.file.mimetype}, Size: ${req.file.size} bytes`);

    const project = await Project.findById(projectId).select("assignedTo createdBy");

    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    const isAssignee = String(project.assignedTo || "") === String(req.user._id);
    const isCreator = String(project.createdBy || "") === String(req.user._id);

    if (!isAssignee && !isCreator) {
      return res.status(403).json({ msg: "Not authorized for OCR on this project" });
    }

    let extractedText, pages;
    try {
      const result = await extractOcrText({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
      });
      extractedText = result.extractedText;
      pages = result.pages;
    } catch (ocrErr) {
      console.error("OCR extraction error:", ocrErr.message);
      const statusCode = ocrErr.statusCode || 500;
      const message = ocrErr.message || "OCR text extraction failed";
      return res.status(statusCode).json({ msg: message });
    }

    let submission = await Submission.findOne({
      projectId,
      userId: req.user._id,
    });

    if (!submission) {
      submission = new Submission({
        projectId,
        userId: req.user._id,
      });
    }

    submission.content = extractedText;
    // OCR is extraction-only; generated files must be recreated from current content.
    submission.fileUrlPDF = "";
    submission.fileUrlWord = "";
    submission.status = "DRAFT";
    await submission.save();

    try {
      await createLog(
        req.user._id,
        "OCR_PROCESSED",
        buildRequestMetadata(req, {
          projectId: String(projectId),
          submissionId: String(submission._id),
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
        })
      );
    } catch (logErr) {
      console.error("Failed to write OCR audit log:", logErr);
    }

    return res.json({ extractedText, pages });
  } catch (err) {
    console.error("Unexpected OCR error:", err);
    return next(err);
  }
};