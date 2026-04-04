import express from "express";
import {
  generateContent,
  generateProjectDescription,
} from "../controllers/aiController.js";
import { auth } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import {
  generateContentSchema,
  generateProjectDescriptionSchema,
} from "../validators/aiSchemas.js";

const router = express.Router();

router.post(
  "/generate-project-description",
  auth,
  validate(generateProjectDescriptionSchema),
  generateProjectDescription
);

router.post(
  "/generate-content",
  auth,
  validate(generateContentSchema),
  generateContent
);

export default router;