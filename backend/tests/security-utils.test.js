import test from "node:test";
import assert from "node:assert/strict";

import { calculateAuditHash } from "../Utils/auditHash.js";
import { hashInviteToken } from "../Utils/inviteToken.js";

test("calculateAuditHash is deterministic for equivalent metadata", () => {
  const first = calculateAuditHash({
    userId: "507f1f77bcf86cd799439011",
    action: "LOGIN_SUCCESS",
    metadata: { b: 2, a: 1 },
    timestamp: "2026-03-19T12:30:00.000Z",
    previousHash: "GENESIS",
    sequence: 1,
  });

  const second = calculateAuditHash({
    userId: "507f1f77bcf86cd799439011",
    action: "LOGIN_SUCCESS",
    metadata: { a: 1, b: 2 },
    timestamp: "2026-03-19T12:30:00.000Z",
    previousHash: "GENESIS",
    sequence: 1,
  });

  assert.equal(first, second);
});

test("hashInviteToken returns stable sha256 hash", () => {
  const token = "0123456789abcdef";

  const first = hashInviteToken(token);
  const second = hashInviteToken(token);

  assert.equal(first.length, 64);
  assert.equal(first, second);
  assert.notEqual(first, token);
});
