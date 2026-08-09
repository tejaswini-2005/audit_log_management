import express from "express";
import {
  acceptProject,
  createProject,
  assignProject,
  getProjectById,
  listProjects,
  rejectProject,
  deleteProject,
} from "../controllers/projectController.js";
import { auth } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import {
  acceptProjectSchema,
  createProjectSchema,
  assignProjectSchema,
  getProjectByIdSchema,
  listProjectsSchema,
} from "../validators/projectSchemas.js";

const router = express.Router();

router.post("/", auth, adminOnly, validate(createProjectSchema), createProject);
router.post("/:id/assign", auth, adminOnly, validate(assignProjectSchema), assignProject);
router.post("/:id/accept", auth, validate(acceptProjectSchema), acceptProject);
router.post("/:id/reject", auth, validate(acceptProjectSchema), rejectProject);
router.get("/", auth, validate(listProjectsSchema), listProjects);
router.get("/:id", auth, validate(getProjectByIdSchema), getProjectById);
router.delete("/:id", auth, adminOnly, deleteProject);

export default router;
