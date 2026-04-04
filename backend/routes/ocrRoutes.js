import express from "express";
import { extractTextFromUpload } from "../controllers/ocrController.js";
import { auth } from "../middleware/authMiddleware.js";
import { uploadSingleFile } from "../middleware/uploadMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { extractTextSchema } from "../validators/ocrSchemas.js";

const router = express.Router();

router.post(
  "/extract-text",
  auth,
  uploadSingleFile,
  validate(extractTextSchema),
  extractTextFromUpload
);

export default router;