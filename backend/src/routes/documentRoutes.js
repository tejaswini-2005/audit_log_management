import express from "express";
import {
  generatePdfDocument,
  generateWordDocument,
  generateBothDocumentsAction,
  getSubmissionDocuments,
} from "../controllers/documentController.js";
import { auth } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import {
  generatePdfSchema,
  generateWordSchema,
  generateBothDocumentsSchema,
  getSubmissionDocumentsSchema,
} from "../validators/documentSchemas.js";

const router = express.Router();

// Generate PDF document
router.post(
  "/generate-pdf",
  auth,
  validate(generatePdfSchema),
  generatePdfDocument,
);

// Generate Word document
router.post(
  "/generate-word",
  auth,
  validate(generateWordSchema),
  generateWordDocument,
);

// Generate both PDF and Word documents
router.post(
  "/generate-both",
  auth,
  validate(generateBothDocumentsSchema),
  generateBothDocumentsAction,
);

// Get submission documents
router.get(
  "/:submissionId",
  auth,
  validate(getSubmissionDocumentsSchema),
  getSubmissionDocuments,
);

export default router;
