import User from "../models/userModel.js";
import transporter from "../config/nodemailer.js";
import { generateInviteToken } from "../Utils/inviteToken.js";
import createLog from "../Utils/logGenerator.js";
import buildRequestMetadata from "../Utils/requestMetadata.js";

export const inviteUser = async (req, res) => {
  const { name, email, role } = req.body;

  const normalizedEmail = String(email || "").trim().toLowerCase();

  const { rawToken, tokenHash, expiresAt } = generateInviteToken();

  let invitedUser = await User.findOne({ email: normalizedEmail });
  let createdNewUser = false;
  let rollbackSnapshot = null;

  if (invitedUser && invitedUser.isVerified) {
    return res.status(409).json({ msg: "User already exists and is active" });
  }

  if (invitedUser) {
    rollbackSnapshot = {
      name: invitedUser.name,
      role: invitedUser.role,
      verifyTokenHash: invitedUser.verifyTokenHash,
      verifyTokenExpiresAt: invitedUser.verifyTokenExpiresAt,
    };

    invitedUser.name = name;
    invitedUser.role = role;
    invitedUser.verifyTokenHash = tokenHash;
    invitedUser.verifyTokenExpiresAt = expiresAt;
    invitedUser.isVerified = false;

    await invitedUser.save();
  } else {
    invitedUser = await User.create({
      name,
      email: normalizedEmail,
      role,
      verifyTokenHash: tokenHash,
      verifyTokenExpiresAt: expiresAt,
      isVerified: false,
    });

    createdNewUser = true;
  }

  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5174").replace(/\/$/, "");
  const link = `${frontendUrl}/accept-invite/${rawToken}`;

  try {
    await transporter.sendMail({
      to: normalizedEmail,
      subject: "Activate Account",
      text: `Click to activate: ${link}`,
    });
  } catch (err) {
    if (createdNewUser) {
      await User.deleteOne({ _id: invitedUser._id });
    } else if (rollbackSnapshot) {
      invitedUser.name = rollbackSnapshot.name;
      invitedUser.role = rollbackSnapshot.role;
      invitedUser.verifyTokenHash = rollbackSnapshot.verifyTokenHash;
      invitedUser.verifyTokenExpiresAt = rollbackSnapshot.verifyTokenExpiresAt;
      await invitedUser.save();
    }

    return res.status(502).json({
      msg: "Unable to send invitation email right now. Please retry.",
    });
  }

  await createLog(
    req.user._id,
    "INVITE_SENT",
    buildRequestMetadata(req, {
      invitedUserId: String(invitedUser._id),
      invitedEmail: normalizedEmail,
      invitedRole: role,
      expiresAt,
    })
  );

  res.json({
    msg: createdNewUser ? "Invite sent" : "Invite re-sent",
    expiresAt,
  });
};

