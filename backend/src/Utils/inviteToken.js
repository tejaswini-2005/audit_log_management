import crypto from "crypto";

const INVITE_TOKEN_BYTES = 32;
const INVITE_TOKEN_TTL_HOURS = 24;

const hashInviteToken = (token) => {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
};

const generateInviteToken = () => {
  const rawToken = crypto.randomBytes(INVITE_TOKEN_BYTES).toString("hex");
  const tokenHash = hashInviteToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TOKEN_TTL_HOURS * 60 * 60 * 1000);

  return {
    rawToken,
    tokenHash,
    expiresAt,
  };
};

export { generateInviteToken, hashInviteToken };
