import crypto from "crypto";

const stableStringify = (value) => {
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

  return crypto.createHash("sha256").update(payload).digest("hex");
};
