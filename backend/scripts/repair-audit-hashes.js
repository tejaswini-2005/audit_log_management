/**
 * Migration script to repair audit log hashes
 * Re-hashes all existing logs using the current normalization and hashing algorithm
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import AuditLog from "../models/AuditLog.js";
import AuditCheckpoint from "../models/AuditCheckpoint.js";
import { calculateAuditHash, stableStringify } from "../Utils/auditHash.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const normalizeMetadata = (value) => {
  if (value === undefined) {
    return null;
  }

  if (value === null) {
    return null;
  }

  if (mongoose.Types.ObjectId.isValid(value) && value._id === undefined && value.toHexString) {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeMetadata(item));
  }

  if (typeof value === "object" && value.constructor === Object) {
    const normalized = {};
    for (const [key, entryValue] of Object.entries(value)) {
      normalized[key] = normalizeMetadata(entryValue);
    }
    return normalized;
  }

  return value;
};

async function repairAuditHashes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected!");

    // Get all logs sorted by sequence
    const logs = await AuditLog.find()
      .sort({ sequence: 1 });

    console.log(`Found ${logs.length} audit logs to repair`);

    let updated = 0;
    let unchanged = 0;

    for (const log of logs) {
      const normalizedMetadata = normalizeMetadata(log.metadata || {});

      // Calculate what the hash SHOULD be
      const correctHash = calculateAuditHash({
        userId: log.userId,
        action: log.action,
        metadata: normalizedMetadata,
        timestamp: log.timestamp,
        previousHash: log.previousHash,
        sequence: log.sequence,
      });

      if (correctHash !== log.currentHash) {
        console.log(
          `[UPDATE] Seq ${log.sequence}: ${log.currentHash.substring(0, 8)}... → ${correctHash.substring(0, 8)}...`
        );
        log.currentHash = correctHash;
        log.metadata = normalizedMetadata;
        await log.save();
        updated++;
      } else {
        unchanged++;
      }
    }

    // Regenerate checkpoints
    console.log("\nRepairing checkpoints...");
    await AuditCheckpoint.deleteMany({});

    const CHECKPOINT_INTERVAL = 50;
    const checkpointLogs = logs.filter((log) => log.sequence % CHECKPOINT_INTERVAL === 0);

    for (const log of checkpointLogs) {
      await AuditCheckpoint.findOneAndUpdate(
        { sequence: log.sequence },
        {
          $setOnInsert: {
            sequence: log.sequence,
            hash: log.currentHash,
            createdAt: log.timestamp,
          },
        },
        { upsert: true }
      );
    }

    console.log(`\nRepair complete!`);
    console.log(`  Updated: ${updated} logs`);
    console.log(`  Unchanged: ${unchanged} logs`);
    console.log(`  Checkpoints regenerated: ${checkpointLogs.length}`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (err) {
    console.error("Error during repair:", err);
    process.exit(1);
  }
}

repairAuditHashes();
