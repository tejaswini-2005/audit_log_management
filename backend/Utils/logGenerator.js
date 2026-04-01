import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.js";
import AuditCounter from "../models/AuditCounter.js";
import AuditCheckpoint from "../models/AuditCheckpoint.js";
import { calculateAuditHash } from "./auditHash.js";

const COUNTER_KEY = "audit-log-sequence";
const CHECKPOINT_INTERVAL = 50;

/**
 * Normalize metadata to ensure deterministic and consistent structure for audit hashing.
 * 
 * Requirements:
 * - Convert undefined → null (preserve all keys)
 * - Handle MongoDB ObjectId → string
 * - Handle Date → ISO string
 * - Recursively normalize nested objects/arrays
 * - Ensure stable output for consistent hashing
 * - Do NOT mutate the original object
 */
const normalizeMetadata = (value) => {
  // Handle undefined → convert to null
  if (value === undefined) {
    return null;
  }

  // Handle null
  if (value === null) {
    return null;
  }

  // Handle MongoDB ObjectId
  if (mongoose.Types.ObjectId.isValid(value) && value._id === undefined && value.toHexString) {
    return value.toString();
  }

  // Handle Date objects → ISO string
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Handle arrays → recursively normalize each element
  if (Array.isArray(value)) {
    return value.map((item) => normalizeMetadata(item));
  }

  // Handle plain objects → recursively normalize all keys and values
  if (typeof value === "object" && value.constructor === Object) {
    const normalized = {};

    // Process all keys, maintaining order
    for (const [key, entryValue] of Object.entries(value)) {
      normalized[key] = normalizeMetadata(entryValue);
    }

    return normalized;
  }

  // Primitives (string, number, boolean) pass through unchanged
  return value;
};

const appendAuditRecord = async ({ userId, action, metadata }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const counter = await AuditCounter.findOneAndUpdate(
      { key: COUNTER_KEY },
      { $inc: { value: 1 } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        session,
      }
    );

    const sequence = counter.value;
    const latestLog = await AuditLog.findOne()
      .sort({ sequence: -1 })
      .select("sequence currentHash")
      .session(session)
      .lean();

    let previousHash = "GENESIS";

    if (sequence > 1) {
      const previousLog = await AuditLog.findOne({ sequence: sequence - 1 })
        .select("currentHash")
        .session(session)
        .lean();

      if (previousLog?.currentHash) {
        previousHash = previousLog.currentHash;
      } else if (latestLog?.sequence === sequence - 1 && latestLog.currentHash) {
        previousHash = latestLog.currentHash;
      } else {
        throw new Error(
          `Unable to resolve previous hash for audit sequence ${sequence}`
        );
      }
    }

    const timestamp = new Date();
    const normalizedMetadata = normalizeMetadata(metadata || {});

    // Debug: Log normalized metadata before hashing (optional, can be disabled)
    if (process.env.DEBUG_AUDIT_HASH === "true") {
      console.log(
        `[AUDIT_HASH_DEBUG] Seq ${sequence}, Action: ${action}, Metadata:`,
        JSON.stringify(normalizedMetadata)
      );
    }

    // Hash with the same normalized metadata that will be stored in DB
    const currentHash = calculateAuditHash({
      userId,
      action,
      metadata: normalizedMetadata,
      timestamp,
      previousHash,
      sequence,
    });

    // Store the identical normalized metadata (no recomputation or mutation)
    await AuditLog.create(
      [
        {
          sequence,
          userId,
          action,
          metadata: normalizedMetadata,
          previousHash,
          currentHash,
          timestamp,
        },
      ],
      { session }
    );

    if (sequence % CHECKPOINT_INTERVAL === 0) {
      await AuditCheckpoint.findOneAndUpdate(
        { sequence },
        {
          $setOnInsert: {
            sequence,
            hash: currentHash,
            createdAt: timestamp,
          },
        },
        {
          upsert: true,
          new: true,
          session,
        }
      );
    }

    await session.commitTransaction();
  } catch (err) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("Failed to create audit log transaction:", err);
    throw err;
  } finally {
    await session.endSession();
  }
};

const createLog = async (userId, action, metadata = {}) => {
  if (!userId || !action) {
    return;
  }

  const safeMetadata = metadata && typeof metadata === "object" ? metadata : {};
  await appendAuditRecord({ userId, action, metadata: safeMetadata });
};

export default createLog;
