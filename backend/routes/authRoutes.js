import express from "express";
import { verifyLink } from "../controllers/authController.js";


import {
  login,
  logout,
  verifyUser,
  registerAdmin,
} from "../controllers/authController.js";

import { auth } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validateMiddleware.js";
import { createRateLimiter } from "../middleware/rateLimitMiddleware.js";
import {
  loginSchema,
  registerAdminSchema,
  verifyLinkSchema,
  verifyUserSchema,
} from "../validators/authSchemas.js";

const router = express.Router();

const loginRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 8,
  keyGenerator: (req) =>
    `login:${req.ip}:${String(req.body?.email || "").toLowerCase()}`,
  message: "Too many login attempts. Try again later.",
});

const registerAdminRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => `register-admin:${req.ip}`,
  message: "Too many admin registration attempts. Try again later.",
});

const verifyRateLimiter = createRateLimiter({
  windowMs: 30 * 60 * 1000,
  max: 12,
  keyGenerator: (req) =>
    `verify:${req.ip}:${String(req.body?.token || req.params?.token || "")}`,
  message: "Too many verification attempts. Try again later.",
});

router.post(
  "/register-admin",
  registerAdminRateLimiter,
  validate(registerAdminSchema),
  registerAdmin
);
router.post("/verify", verifyRateLimiter, validate(verifyUserSchema), verifyUser);
router.get(
  "/verify-link/:token",
  verifyRateLimiter,
  validate(verifyLinkSchema),
  verifyLink
);
router.post("/login", loginRateLimiter, validate(loginSchema), login);
router.post("/logout", auth, logout);
router.get("/me", auth, (req, res) => {
  res.json(req.user);
});

export default router;
