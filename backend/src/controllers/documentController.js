import Project from "../models/Project.js";
import Submission from "../models/Submission.js";
import createLog from "../Utils/logGenerator.js";
import buildRequestMetadata from "../Utils/requestMetadata.js";
import {
  generatePDF,
  generateWord,
  generateBothDocuments,
  getDocumentUrls,
  deleteDocument,
} from "../Utils/documentGenerator.js";

/**
 * Generate PDF document from submission content
 * POST /documents/generate-pdf
 */
export const generatePdfDocument = async (req, res, next) => {
  try {
    const { projectId } = req.body;
    const content = String(req.body?.content || "").trim();
    const userId = req.user._id;

    if (!content) {
      return res.status(400).json({ msg: "Content cannot be empty" });
    }

    // Verify project exists and user has access
    const project = await Project.findById(projectId).select("assignedTo createdBy title");
    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    const isAssignee = String(project.assignedTo || "") === String(userId);
    const isCreator = String(project.createdBy || "") === String(userId);

    if (!isAssignee && !isCreator) {
      return res.status(403).json({ msg: "Not authorized for this project" });
    }

    // Generate PDF
    const pdfResult = await generatePDF(content, `${projectId}`);

    // Update or create submission with PDF URL
    let submission = await Submission.findOne({
      projectId,
      userId,
    });

    if (!submission) {
      submission = new Submission({
        projectId,
        userId,
        content,
      });
    }

    submission.content = content;
    submission.fileUrlPDF = `/documents/${pdfResult.fileName}`;
    await submission.save();

    // Create audit log
    await createLog(userId, "PDF_GENERATED", 
      buildRequestMetadata(req, {
        projectId: String(projectId),
        submissionId: String(submission._id),
        projectTitle: project.title,
        fileName: pdfResult.fileName,
        source: "CONTENT",
      })
    );

    return res.status(200).json({
      msg: "PDF generated successfully",
      fileUrl: submission.fileUrlPDF,
      fileName: pdfResult.fileName,
      submissionId: submission._id,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Generate Word document from submission content
 * POST /documents/generate-word
 */
export const generateWordDocument = async (req, res, next) => {
  try {
    const { projectId } = req.body;
    const content = String(req.body?.content || "").trim();
    const userId = req.user._id;

    if (!content) {
      return res.status(400).json({ msg: "Content cannot be empty" });
    }

    // Verify project exists and user has access
    const project = await Project.findById(projectId).select("assignedTo createdBy title");
    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    const isAssignee = String(project.assignedTo || "") === String(userId);
    const isCreator = String(project.createdBy || "") === String(userId);

    if (!isAssignee && !isCreator) {
      return res.status(403).json({ msg: "Not authorized for this project" });
    }

    // Generate Word document
    const wordResult = await generateWord(content, `${projectId}`);

    // Update or create submission with Word URL
    let submission = await Submission.findOne({
      projectId,
      userId,
    });

    if (!submission) {
      submission = new Submission({
        projectId,
        userId,
        content,
      });
    }

    submission.content = content;
    submission.fileUrlWord = `/documents/${wordResult.fileName}`;
    await submission.save();

    // Create audit log
    await createLog(userId, "DOCUMENT_CONVERTED",
      buildRequestMetadata(req, {
        projectId: String(projectId),
        submissionId: String(submission._id),
        projectTitle: project.title,
        fileName: wordResult.fileName,
        documentType: "Word",
        source: "CONTENT",
      })
    );

    return res.status(200).json({
      msg: "Word document generated successfully",
      fileUrl: submission.fileUrlWord,
      fileName: wordResult.fileName,
      submissionId: submission._id,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Generate both PDF and Word documents from the same content
 * POST /documents/generate-both
 */
export const generateBothDocumentsAction = async (req, res, next) => {
  try {
    const { projectId } = req.body;
    const content = String(req.body?.content || "").trim();
    const userId = req.user._id;

    if (!content) {
      return res.status(400).json({ msg: "Content cannot be empty" });
    }

    // Verify project exists and user has access
    const project = await Project.findById(projectId).select("assignedTo createdBy title");
    if (!project) {
      return res.status(404).json({ msg: "Project not found" });
    }

    const isAssignee = String(project.assignedTo || "") === String(userId);
    const isCreator = String(project.createdBy || "") === String(userId);

    if (!isAssignee && !isCreator) {
      return res.status(403).json({ msg: "Not authorized for this project" });
    }

    // Generate both documents from the same content
    const documents = await generateBothDocuments(content, `${projectId}`);

    // Update or create submission with both URLs
    let submission = await Submission.findOne({
      projectId,
      userId,
    });

    if (!submission) {
      submission = new Submission({
        projectId,
        userId,
        content,
      });
    }

    submission.content = content;
    submission.fileUrlPDF = `/documents/${documents.pdf.fileName}`;
    submission.fileUrlWord = `/documents/${documents.word.fileName}`;
    await submission.save();

    // Create audit logs for both documents
    await Promise.all([
      createLog(userId, "PDF_GENERATED",
        buildRequestMetadata(req, {
          projectId: String(projectId),
          submissionId: String(submission._id),
          projectTitle: project.title,
          fileName: documents.pdf.fileName,
          source: "CONTENT",
        })
      ),
      createLog(userId, "DOCUMENT_CONVERTED",
        buildRequestMetadata(req, {
          projectId: String(projectId),
          submissionId: String(submission._id),
          projectTitle: project.title,
          fileName: documents.word.fileName,
          documentType: "Word",
          source: "CONTENT",
        })
      ),
    ]);

    return res.status(200).json({
      msg: "Both documents generated successfully",
      documents: {
        pdf: {
          fileUrl: submission.fileUrlPDF,
          fileName: documents.pdf.fileName,
        },
        word: {
          fileUrl: submission.fileUrlWord,
          fileName: documents.word.fileName,
        },
      },
      submissionId: submission._id,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Get submission document URLs
 * GET /documents/:submissionId
 */
export const getSubmissionDocuments = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const userId = req.user._id;

    const submission = await Submission.findById(submissionId)
      .populate("projectId", "title")
      .select("projectId userId fileUrlPDF fileUrlWord createdAt");

    if (!submission) {
      return res.status(404).json({ msg: "Submission not found" });
    }

    // Verify authorization
    const isOwner = String(submission.userId) === String(userId);
    if (!isOwner) {
      return res.status(403).json({ msg: "Not authorized to view this submission" });
    }

    return res.status(200).json({
      submissionId: submission._id,
      projectId: submission.projectId._id,
      projectTitle: submission.projectId.title,
      documents: {
        pdf: submission.fileUrlPDF || null,
        word: submission.fileUrlWord || null,
      },
      createdAt: submission.createdAt,
    });
  } catch (err) {
    return next(err);
  }
};
