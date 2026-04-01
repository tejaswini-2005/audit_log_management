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
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => `login:${req.ip}`,
  message: "Too many login attempts. Try again later.",
});

router.post(
  "/register-admin",
  validate(registerAdminSchema),
  registerAdmin
);
router.get("/csrf-token", (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});
router.post("/verify", validate(verifyUserSchema), verifyUser);
router.get(
  "/verify-link/:token",
  validate(verifyLinkSchema),
  verifyLink
);
router.post("/login", loginRateLimiter, validate(loginSchema), login);
router.post("/logout", auth, logout);
router.get("/me", auth, (req, res) => {
  res.json(req.user);
});

export default router;
