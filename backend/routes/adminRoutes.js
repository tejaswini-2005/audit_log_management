import express from "express";
import { inviteUser } from "../controllers/adminController.js";
import { auth } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/roleMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { inviteUserSchema } from "../validators/adminSchemas.js";
import { createRateLimiter } from "../middleware/rateLimitMiddleware.js";

const router = express.Router();

const inviteRateLimiter = createRateLimiter({
	windowMs: 10 * 60 * 1000,
	max: 30,
	keyGenerator: (req) => `invite:${req.ip}:${req.user?._id || "anonymous"}`,
	message: "Too many invite requests. Try again later.",
});

router.post("/invite", auth, adminOnly, inviteRateLimiter, validate(inviteUserSchema), inviteUser);

export default router;
