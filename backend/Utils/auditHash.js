import crypto from "crypto";

export const stableStringify = (value) => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
};

export const calculateAuditHash = ({
  userId,
  action,
  metadata,
  timestamp,
  previousHash,
  sequence,
}) => {
  // Assume metadata is already normalized (by caller)
  // Do not modify metadata inside this function

  const safeTimestamp =
    timestamp instanceof Date
      ? timestamp.toISOString()
      : new Date(timestamp).toISOString();

  const payload = [
    String(userId),
    String(action),
    stableStringify(metadata || {}),
    safeTimestamp,
    String(previousHash),
    String(sequence),
  ].join("|");

  // Debug: Log payload before hashing (optional, can be disabled)
  if (process.env.DEBUG_AUDIT_HASH === "true") {
    console.log("[AUDIT_HASH_PAYLOAD]", payload);
  }

  return crypto.createHash("sha256").update(payload).digest("hex");
};
