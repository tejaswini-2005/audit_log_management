import AuditLog from "../models/AuditLog.js";
import User from "../models/userModel.js";
import crypto from "crypto";
import { calculateAuditHash } from "../Utils/auditHash.js";
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
  ];

  // Backward compatibility for historical integrity-failure logs that were
  // hashed with an undefined `sequence` metadata key before persistence dropped it.
  if (
    action === "INTEGRITY_CHECK_FAILED" &&
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

export const verifyLogIntegrity = async (req, res) => {
  const failIntegrity = async ({
    reason,
    message,
    failedAtSequence,
    failedAtTimestamp,
  }) => {
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

  const logs = await AuditLog.find()
    .sort({ timestamp: 1 })
    .select("sequence userId action metadata timestamp previousHash currentHash")
    .lean();

  const legacyLogs = logs.filter((log) => !hasValidSequence(log.sequence));
  const modernLogs = logs
    .filter((log) => hasValidSequence(log.sequence))
    .sort((a, b) => a.sequence - b.sequence);

  let checked = 0;

  let legacyPreviousHash = "GENESIS";
  for (const log of legacyLogs) {
    checked += 1;

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

  let expectedPreviousHash = "GENESIS";
  let previousSequence = 0;

  for (const log of modernLogs) {
    checked += 1;

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
      return failIntegrity({
        reason: "CURRENT_HASH_MISMATCH",
        message: "Audit log hash mismatch",
        failedAtSequence: log.sequence,
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
      legacyChecked: legacyLogs.length,
      modernChecked: modernLogs.length,
    })
  );

  const mixedMode = legacyLogs.length > 0 && modernLogs.length > 0;

  res.json({
    integrity: true,
    message: mixedMode
      ? "Audit log chains are valid (legacy + sequence formats)"
      : "Audit log chain is valid",
    checked,
    legacyChecked: legacyLogs.length,
    modernChecked: modernLogs.length,
  });
};
