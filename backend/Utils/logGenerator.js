import AuditLog from "../models/AuditLog.js";
import AuditCounter from "../models/AuditCounter.js";
import { calculateAuditHash } from "./auditHash.js";

const COUNTER_KEY = "audit-log-sequence";
const WAIT_MS = 25;
const MAX_PREVIOUS_WAIT_ATTEMPTS = 40;

let appendQueue = Promise.resolve();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeMetadata = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeMetadata(item));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, entryValue]) => {
      if (entryValue === undefined) {
        return acc;
      }

      acc[key] = normalizeMetadata(entryValue);
      return acc;
    }, {});
  }

  return value;
};

const getPreviousHash = async (sequence) => {
  if (sequence <= 1) {
    return "GENESIS";
  }

  for (let attempt = 0; attempt < MAX_PREVIOUS_WAIT_ATTEMPTS; attempt += 1) {
    const previousLog = await AuditLog.findOne({ sequence: sequence - 1 }).select(
      "currentHash"
    );

    if (previousLog?.currentHash) {
      return previousLog.currentHash;
    }

    await wait(WAIT_MS);
  }

  const latestLog = await AuditLog.findOne().sort({ sequence: -1 }).select("currentHash");
  return latestLog?.currentHash || "GENESIS";
};

const appendAuditRecord = async ({ userId, action, metadata }) => {
  const counter = await AuditCounter.findOneAndUpdate(
    { key: COUNTER_KEY },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const sequence = counter.value;
  const previousHash = await getPreviousHash(sequence);
  const timestamp = new Date();
  const normalizedMetadata = normalizeMetadata(metadata || {});

  const currentHash = calculateAuditHash({
    userId,
    action,
    metadata: normalizedMetadata,
    timestamp,
    previousHash,
    sequence,
  });

  await AuditLog.create({
    sequence,
    userId,
    action,
    metadata: normalizedMetadata,
    previousHash,
    currentHash,
    timestamp,
  });
};

const createLog = async (userId, action, metadata = {}) => {
  if (!userId || !action) {
    return;
  }

  const safeMetadata = metadata && typeof metadata === "object" ? metadata : {};

  appendQueue = appendQueue
    .then(() => appendAuditRecord({ userId, action, metadata: safeMetadata }))
    .catch((err) => {
      console.error("Failed to create audit log:", err.message);
    });

  await appendQueue;
};

export default createLog;
