import express from "express";
import {
  createOrUpdateDraftSubmission,
  convertSubmissionToWord,
  getSubmissionsByProject,
  submitSubmission,
  reviewSubmission,
  getAllSubmissions,
} from "../controllers/submissionController.js";
import { auth } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import {
  convertSubmissionToWordSchema,
  createOrUpdateSubmissionSchema,
  getSubmissionsByProjectSchema,
  submitSubmissionSchema,
  reviewSubmissionSchema,
} from "../validators/submissionSchemas.js";

const router = express.Router();

// Admin route - get all submissions
router.get("/", auth, adminOnly, getAllSubmissions);

// User routes
router.post("/", auth, validate(createOrUpdateSubmissionSchema), createOrUpdateDraftSubmission);
router.get("/:projectId", auth, validate(getSubmissionsByProjectSchema), getSubmissionsByProject);
router.post("/:submissionId/convert-word", auth, validate(convertSubmissionToWordSchema), convertSubmissionToWord);
router.post("/:submissionId/submit", auth, validate(submitSubmissionSchema), submitSubmission);
router.post("/:submissionId/review", auth, adminOnly, validate(reviewSubmissionSchema), reviewSubmission);

export default router;