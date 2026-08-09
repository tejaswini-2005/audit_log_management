import express from "express";
import {
  createResearchItem,
  convertResearchToProject,
  generateResearchWithAI,
  getResearchItems,
  updateResearchItem,
  deleteResearchItem,
} from "../controllers/researchController.js";
import { auth } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import {
  aiGenerateResearchSchema,
  convertResearchToProjectSchema,
  createResearchSchema,
  listResearchSchema,
  patchResearchSchema,
} from "../validators/researchSchemas.js";

const router = express.Router();

router.post("/", auth, adminOnly, validate(createResearchSchema), createResearchItem);
router.post(
  "/ai-generate",
  auth,
  adminOnly,
  validate(aiGenerateResearchSchema),
  generateResearchWithAI
);
router.get("/", auth, adminOnly, validate(listResearchSchema), getResearchItems);
router.patch("/:id", auth, adminOnly, validate(patchResearchSchema), updateResearchItem);
router.delete("/:id", auth, adminOnly, deleteResearchItem);
router.post(
  "/:id/convert-to-project",
  auth,
  adminOnly,
  validate(convertResearchToProjectSchema),
  convertResearchToProject
);

export default router;
