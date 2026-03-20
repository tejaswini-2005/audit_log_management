import User from "../models/userModel.js";
import generateToken from "../Utils/generateToken.js";
import createLog from "../Utils/logGenerator.js";
import { clearCookieOptions, cookieName } from "../config/security.js";
import { hashInviteToken } from "../Utils/inviteToken.js";
import buildRequestMetadata from "../Utils/requestMetadata.js";

const findUserByInviteToken = async (token) => {
  const tokenHash = hashInviteToken(token);

  return User.findOne({
    verifyTokenHash: tokenHash,
    verifyTokenExpiresAt: { $gt: new Date() },
  });
};

export const verifyLink = async (req, res) => {
  const { token } = req.params;

  const user = await findUserByInviteToken(token);

  if (!user) {
    return res.status(400).send(`
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h2>Invalid or Expired Token</h2>
          <p>This verification link is no longer valid.</p>
        </body>
      </html>
    `);
  }

  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5174").replace(/\/$/, "");
  return res.redirect(`${frontendUrl}/accept-invite/${token}`);
};

export const verifyUser = async (req, res) => {
  const { token, password } = req.body;

  const user = await findUserByInviteToken(token);

  if (!user) return res.status(400).json({ msg: "Invalid or expired token" });

  user.password = password;
  user.isVerified = true;
  user.verifyTokenHash = undefined;
  user.verifyTokenExpiresAt = undefined;

  await user.save();

  await createLog(user._id, "INVITE_ACCEPTED", buildRequestMetadata(req));

  res.json({ msg: "Account activated" });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = String(email || "").trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return res.status(400).json({ msg: "Invalid email or password" });
  }

  if (!user.isVerified) {
    await createLog(
      user._id,
      "LOGIN_FAILED",
      buildRequestMetadata(req, { reason: "ACCOUNT_NOT_VERIFIED" })
    );

    return res.status(400).json({ msg: "Account is not verified" });
  }

  const match = await user.comparePassword(password);

  if (!match) {
    await createLog(
      user._id,
      "LOGIN_FAILED",
      buildRequestMetadata(req, { reason: "INVALID_PASSWORD" })
    );
    return res.status(400).json({ msg: "Invalid email or password" });
  }

  generateToken(user._id, res);

  await createLog(user._id, "LOGIN_SUCCESS", buildRequestMetadata(req));

  res.json({ msg: "Logged in" });
};

export const logout = async (req, res) => {
  await createLog(req.user._id, "LOGOUT", buildRequestMetadata(req));

  res.clearCookie(cookieName, clearCookieOptions);

  res.json({ msg: "Logged out" });
};

export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, secret } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    // Check secret
    if (secret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ msg: "Invalid admin secret" });
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: "ADMIN" });

    if (existingAdmin) {
      return res
        .status(400)
        .json({ msg: "Admin already exists" });
    }

    // Check email
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ msg: "User exists" });
    }

    // Create admin
    const admin = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: "ADMIN",
      isVerified: true,
    });

    await createLog(
      admin._id,
      "ADMIN_CREATED",
      buildRequestMetadata(req, { email: normalizedEmail })
    );

    res.status(201).json({
      msg: "Admin registered",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
      },
    });
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

