import AuditLog from "../models/AuditLog.js";
import AuditCheckpoint from "../models/AuditCheckpoint.js";
import User from "../models/userModel.js";
import crypto from "crypto";
import { calculateAuditHash, stableStringify } from "../Utils/auditHash.js";
import createLog from "../Utils/logGenerator.js";
import buildRequestMetadata from "../Utils/requestMetadata.js";

const hasValidSequence = (value) => Number.isInteger(value) && value > 0;

const calculateLegacyAuditHash = ({
  userId,
  action,
  metadata,
  timestamp,
  previousHash,
}) => {
  const payload = `${String(userId)}${String(action)}${JSON.stringify(
    metadata || {}
  )}${timestamp}${String(previousHash)}`;

  return crypto.createHash("sha256").update(payload).digest("hex");
};

const calculateCompatibilityHashCandidates = ({
  userId,
  action,
  metadata,
  timestamp,
  previousHash,
  sequence,
}) => {
  const normalizedTimestamp =
    timestamp instanceof Date ? timestamp : new Date(timestamp);

  const timestampCandidates = [];

  // Try different timestamp formats
  timestampCandidates.push(String(timestamp)); // Raw string
  if (!Number.isNaN(normalizedTimestamp.getTime())) {
    timestampCandidates.push(normalizedTimestamp.toISOString());
    timestampCandidates.push(normalizedTimestamp.toString());
  }

  const candidates = [];

  /**
   * Generate metadata variants to handle backward compatibility:
   * 1. Current metadata (with proper normalization)
   * 2. Metadata with undefined values filtered out (old behavior)
   */

  // Helper to filter out undefined keys (old behavior)
  const filterUndefinedMetadata = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map((item) => filterUndefinedMetadata(item));
    }

    if (obj && typeof obj === "object" && obj.constructor === Object) {
      return Object.entries(obj).reduce((acc, [key, value]) => {
        if (value === undefined) {
          return acc; // Skip undefined keys (old behavior)
        }

        acc[key] = filterUndefinedMetadata(value);
        return acc;
      }, {});
    }

    return obj;
  };

  const metadataVariants = [
    metadata || {}, // Current metadata (with nulls preserved)
    filterUndefinedMetadata(metadata || {}), // Old behavior (undefined filtered)
  ];

  // Generate candidates for each metadata variant
  for (const metadataVariant of metadataVariants) {
    for (const ts of timestampCandidates) {
      // Use stableStringify (actual audit hash format)
      const stablePayload = [
        String(userId),
        String(action),
        stableStringify(metadataVariant),
        ts,
        String(previousHash),
        String(sequence),
      ].join("|");

      candidates.push(
        crypto.createHash("sha256").update(stablePayload).digest("hex")
      );

      // Also try with ISO timestamp in the stable payload (modern format)
      if (ts !== normalizedTimestamp.toISOString()) {
        const isoPayload = [
          String(userId),
          String(action),
          stableStringify(metadataVariant),
          normalizedTimestamp.toISOString(),
          String(previousHash),
          String(sequence),
        ].join("|");

        candidates.push(
          crypto.createHash("sha256").update(isoPayload).digest("hex")
        );
      }
    }
  }

  // Legacy format without sequence
  candidates.push(
    calculateLegacyAuditHash({
      userId,
      action,
      metadata,
      timestamp,
      previousHash,
    })
  );

  return [...new Set(candidates)];
};

const calculateModernHashCandidates = ({
  userId,
  action,
  metadata,
  timestamp,
  previousHash,
  sequence,
}) => {
  const candidates = [
    calculateAuditHash({
      userId,
      action,
      metadata,
      timestamp,
      previousHash,
      sequence,
    }),
    ...calculateCompatibilityHashCandidates({
      userId,
      action,
      metadata,
      timestamp,
      previousHash,
      sequence,
    }),
  ];

  // Backward compatibility for historical integrity-failure logs that were
  // hashed with an undefined `sequence` metadata key before persistence dropped it.
  if (
    ["INTEGRITY_CHECK_FAILED", "INTEGRITY_CHECK_PASSED"].includes(action) &&
    metadata &&
    typeof metadata === "object"
  ) {
    const legacyMetadataVariants = [{ ...metadata }];

    if (!Object.prototype.hasOwnProperty.call(metadata, "sequence")) {
      legacyMetadataVariants.push({
        ...metadata,
        sequence: undefined,
      });
    }

    if (!Object.prototype.hasOwnProperty.call(metadata, "failedAtSequence")) {
      legacyMetadataVariants.push({
        ...metadata,
        failedAtSequence: undefined,
      });
    }

    if (!Object.prototype.hasOwnProperty.call(metadata, "failedAtTimestamp")) {
      legacyMetadataVariants.push({
        ...metadata,
        failedAtTimestamp: undefined,
      });
    }

    if (!Object.prototype.hasOwnProperty.call(metadata, "checked")) {
      legacyMetadataVariants.push({
        ...metadata,
        checked: undefined,
      });
    }

    if (!Object.prototype.hasOwnProperty.call(metadata, "legacyChecked")) {
      legacyMetadataVariants.push({
        ...metadata,
        legacyChecked: undefined,
      });
    }

    if (!Object.prototype.hasOwnProperty.call(metadata, "modernChecked")) {
      legacyMetadataVariants.push({
        ...metadata,
        modernChecked: undefined,
      });
    }

    if (!Object.prototype.hasOwnProperty.call(metadata, "checkpointSequence")) {
      legacyMetadataVariants.push({
        ...metadata,
        checkpointSequence: undefined,
      });
    }

    const withAllUndefinedKeys = {
      ...metadata,
      sequence: Object.prototype.hasOwnProperty.call(metadata, "sequence")
        ? metadata.sequence
        : undefined,
      failedAtSequence: Object.prototype.hasOwnProperty.call(
        metadata,
        "failedAtSequence"
      )
        ? metadata.failedAtSequence
        : undefined,
      failedAtTimestamp: Object.prototype.hasOwnProperty.call(
        metadata,
        "failedAtTimestamp"
      )
        ? metadata.failedAtTimestamp
        : undefined,
      checked: Object.prototype.hasOwnProperty.call(metadata, "checked")
        ? metadata.checked
        : undefined,
      legacyChecked: Object.prototype.hasOwnProperty.call(metadata, "legacyChecked")
        ? metadata.legacyChecked
        : undefined,
      modernChecked: Object.prototype.hasOwnProperty.call(metadata, "modernChecked")
        ? metadata.modernChecked
        : undefined,
      checkpointSequence: Object.prototype.hasOwnProperty.call(
        metadata,
        "checkpointSequence"
      )
        ? metadata.checkpointSequence
        : undefined,
    };

    legacyMetadataVariants.push(withAllUndefinedKeys);

    for (const variant of legacyMetadataVariants) {
      candidates.push(
        calculateAuditHash({
          userId,
          action,
          metadata: variant,
          timestamp,
          previousHash,
          sequence,
        })
      );

      candidates.push(
        ...calculateCompatibilityHashCandidates({
          userId,
          action,
          metadata: variant,
          timestamp,
          previousHash,
          sequence,
        })
      );
    }
  }

  return [...new Set(candidates)];
};

const buildPagination = ({ page, limit, total }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
};

export const getMyLogs = async (req, res) => {
  const queryParams = req.validated?.query || req.query || {};
  const page = Number(queryParams.page || 1);
  const limit = Number(queryParams.limit || 20);
  const skip = (page - 1) * limit;

  const query = { userId: req.user._id };

  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.find(query)
      .sort({ sequence: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v"),
  ]);

  res.json({
    items: logs,
    pagination: buildPagination({ page, limit, total }),
  });
};

export const getAllLogs = async (req, res) => {
  const queryParams = req.validated?.query || req.query || {};
  const { email, action, from, to } = queryParams;
  const page = Number(queryParams.page || 1);
  const limit = Number(queryParams.limit || 20);
  const skip = (page - 1) * limit;

  const query = {};

  if (email) {
    const found = await User.findOne({ email: String(email).toLowerCase() }).select("_id");
    if (!found) {
      return res.json({
        items: [],
        pagination: buildPagination({ page, limit, total: 0 }),
      });
    }
    query.userId = found._id;
  }

  if (action) {
    query.action = String(action).trim().toUpperCase();
  }

  if (from || to) {
    query.timestamp = {};

    if (from) {
      query.timestamp.$gte = new Date(from);
    }

    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      query.timestamp.$lte = end;
    }
  }

  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.find(query)
      .populate("userId", "email role")
      .sort({ sequence: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v"),
  ]);

  res.json({
    items: logs,
    pagination: buildPagination({ page, limit, total }),
  });
};

export const verifyLogIntegrity = async (req, res, next) => {
  try {
    const failIntegrity = async ({
      reason,
      message,
      failedAtSequence,
      failedAtTimestamp,
      debugData,
    }) => {
      console.error(`[INTEGRITY FAIL] Reason: ${reason}, Sequence: ${failedAtSequence}, Debug:`, debugData);

      await createLog(
        req.user._id,
        "INTEGRITY_CHECK_FAILED",
        buildRequestMetadata(req, {
          reason,
          failedAtSequence,
          failedAtTimestamp,
        })
      );

      return res.json({
        integrity: false,
        message,
        failedAtSequence,
        failedAtTimestamp,
      });
    };

    const latestCheckpoint = await AuditCheckpoint.findOne()
      .sort({ sequence: -1 })
      .select("sequence hash")
      .lean();

    let activeCheckpoint = latestCheckpoint;

    let checked = 0;
    let legacyChecked = 0;
    let modernChecked = 0;

    let expectedPreviousHash = "GENESIS";
    let previousSequence = 0;

    if (activeCheckpoint) {
      const checkpointLog = await AuditLog.findOne({ sequence: activeCheckpoint.sequence })
        .select("sequence currentHash")
        .lean();

      if (!checkpointLog || checkpointLog.currentHash !== activeCheckpoint.hash) {
        activeCheckpoint = null;
      }
    }

    if (activeCheckpoint) {
      expectedPreviousHash = activeCheckpoint.hash;
      previousSequence = activeCheckpoint.sequence;
    } else {
      const logs = await AuditLog.find()
        .sort({ timestamp: 1 })
        .select("sequence userId action metadata timestamp previousHash currentHash")
        .lean();

      const legacyLogs = logs.filter((log) => !hasValidSequence(log.sequence));
      const modernLogs = logs
        .filter((log) => hasValidSequence(log.sequence))
        .sort((a, b) => a.sequence - b.sequence);

      let legacyPreviousHash = "GENESIS";
      for (const log of legacyLogs) {
        checked += 1;
        legacyChecked += 1;

        if (log.previousHash !== legacyPreviousHash) {
          return failIntegrity({
            reason: "LEGACY_PREVIOUS_HASH_MISMATCH",
            message: "Legacy audit log chain compromised",
            failedAtTimestamp: log.timestamp,
          });
        }

        const recalculatedLegacyHash = calculateLegacyAuditHash({
          userId: log.userId,
          action: log.action,
          metadata: log.metadata,
          timestamp: log.timestamp,
          previousHash: legacyPreviousHash,
        });

        if (recalculatedLegacyHash !== log.currentHash) {
          return failIntegrity({
            reason: "LEGACY_CURRENT_HASH_MISMATCH",
            message: "Legacy audit log hash mismatch",
            failedAtTimestamp: log.timestamp,
          });
        }

        legacyPreviousHash = log.currentHash;
      }

      expectedPreviousHash = "GENESIS";
      previousSequence = 0;

      for (const log of modernLogs) {
        checked += 1;
        modernChecked += 1;

        if (previousSequence !== 0 && log.sequence <= previousSequence) {
          return failIntegrity({
            reason: "SEQUENCE_ORDER_INVALID",
            message: "Audit log sequence order is invalid",
            failedAtSequence: log.sequence,
          });
        }

        if (log.previousHash !== expectedPreviousHash) {
          return failIntegrity({
            reason: "PREVIOUS_HASH_MISMATCH",
            message: "Audit log chain compromised",
            failedAtSequence: log.sequence,
          });
        }

        const hashCandidates = calculateModernHashCandidates({
          userId: log.userId,
          action: log.action,
          metadata: log.metadata,
          timestamp: log.timestamp,
          previousHash: expectedPreviousHash,
          sequence: log.sequence,
        });

        if (!hashCandidates.includes(log.currentHash)) {
          const matchedIndex = hashCandidates.indexOf(log.currentHash);
          
          console.error(`\n[HASH MISMATCH] Sequence: ${log.sequence}, Action: ${log.action}`);
          console.error(`  Stored hash: ${log.currentHash}`);
          console.error(`  Generated ${hashCandidates.length} candidates, no match found`);
          console.error(`  Metadata: ${JSON.stringify(log.metadata)}`);
          console.error(`  UserId: ${log.userId}, PrevHash: ${expectedPreviousHash.substring(0, 8)}...\n`);
          
          return failIntegrity({
            reason: "CURRENT_HASH_MISMATCH",
            message: "Audit log hash mismatch",
            failedAtSequence: log.sequence,
            debugData: {
              candidates: hashCandidates.length,
              storedHash: log.currentHash,
              action: log.action,
            },
          });
        }

        expectedPreviousHash = log.currentHash;
        previousSequence = log.sequence;
      }
    }

    const logsToVerify = await AuditLog.find({ sequence: { $gt: previousSequence } })
      .sort({ sequence: 1 })
      .select("sequence userId action metadata timestamp previousHash currentHash")
      .lean();

    for (const log of logsToVerify) {
      checked += 1;
      modernChecked += 1;

      if (log.sequence <= previousSequence) {
        return failIntegrity({
          reason: "SEQUENCE_ORDER_INVALID",
          message: "Audit log sequence order is invalid",
          failedAtSequence: log.sequence,
        });
      }

      if (log.previousHash !== expectedPreviousHash) {
        return failIntegrity({
          reason: "PREVIOUS_HASH_MISMATCH",
          message: "Audit log chain compromised",
          failedAtSequence: log.sequence,
        });
      }

      const hashCandidates = calculateModernHashCandidates({
        userId: log.userId,
        action: log.action,
        metadata: log.metadata,
        timestamp: log.timestamp,
        previousHash: expectedPreviousHash,
        sequence: log.sequence,
      });

      if (!hashCandidates.includes(log.currentHash)) {
        console.error(`\n[HASH MISMATCH] Sequence: ${log.sequence}, Action: ${log.action}`);
        console.error(`  Stored hash: ${log.currentHash}`);
        console.error(`  Generated ${hashCandidates.length} candidates, no match found`);
        console.error(`  Metadata: ${JSON.stringify(log.metadata)}`);
        console.error(`  UserId: ${log.userId}, PrevHash: ${expectedPreviousHash.substring(0, 8)}...\n`);
        
        return failIntegrity({
          reason: "CURRENT_HASH_MISMATCH",
          message: "Audit log hash mismatch",
          failedAtSequence: log.sequence,
          debugData: {
            candidates: hashCandidates.length,
            storedHash: log.currentHash,
            action: log.action,
          },
        });
      }

      expectedPreviousHash = log.currentHash;
      previousSequence = log.sequence;
    }

    await createLog(
      req.user._id,
      "INTEGRITY_CHECK_PASSED",
      buildRequestMetadata(req, {
        checked,
        legacyChecked,
        modernChecked,
        checkpointSequence: activeCheckpoint?.sequence,
      })
    );

    const usedCheckpoint = Boolean(activeCheckpoint);
    const mixedMode = legacyChecked > 0 && modernChecked > 0;

    return res.json({
      integrity: true,
      message: usedCheckpoint
        ? "Audit log chain is valid from latest checkpoint"
        : mixedMode
          ? "Audit log chains are valid (legacy + sequence formats)"
          : "Audit log chain is valid",
      checked,
      legacyChecked,
      modernChecked,
      checkpointSequence: activeCheckpoint?.sequence,
    });
  } catch (err) {
    return next(err);
  }
};
