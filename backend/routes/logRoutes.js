import express from "express";

import {
  getMyLogs,
  getAllLogs,
} from "../controllers/logController.js";

import { auth } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import { verifyLogIntegrity } from "../controllers/logController.js";
import { validate } from "../middleware/validateMiddleware.js";
import { getAllLogsSchema, getMyLogsSchema } from "../validators/logSchemas.js";

const router = express.Router();
router.get("/verify-integrity", auth, adminOnly, verifyLogIntegrity);

router.get("/me", auth, validate(getMyLogsSchema), getMyLogs);
router.get("/all", auth, adminOnly, validate(getAllLogsSchema), getAllLogs);

export default router;
