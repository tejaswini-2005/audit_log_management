# Audit Log Integrity Check - Supported Actions

## Overview

The integrity check API (`GET /api/v1/logs/verify-integrity`) uses hash-chain verification to ensure audit logs have not been tampered with. All audit actions are automatically supported by the integrity check system using a generic hashing mechanism.

> **Important:** No changes were made to the hashing logic. All new actions are supported automatically through the immutable hash-chain system.

---

## Audit Actions

### Authentication & Authorization
| Action | Logged By | Description |
|--------|-----------|-------------|
| `INVITE_SENT` | Admin | Invitation sent to new user |
| `INVITE_ACCEPTED` | User | User accepts an invitation |
| `LOGIN_SUCCESS` | User | Successful user login |
| `LOGIN_FAILED` | User | Failed login attempt |
| `LOGOUT` | User | User logout |

### Content Management
| Action | Logged By | Description |
|--------|-----------|-------------|
| `CONTENT_EDITED` | User | User creates or edits draft content |

### Document Generation ✨ NEW
| Action | Logged By | Description |
|--------|-----------|-------------|
| `PDF_GENERATED` | User | PDF document generated from content |
| `DOCUMENT_CONVERTED` | User | Word (.docx) document generated from content |

### Submission Workflow ✨ NEW
| Action | Logged By | Description |
|--------|-----------|-------------|
| `DOCUMENT_SUBMITTED` | User | Draft submission marked as submitted |
| `DOCUMENT_REVIEWED` | Admin | Admin reviews a submission |
| `DOCUMENT_APPROVED` | Admin | Admin approves a submission |
| `DOCUMENT_REJECTED` | Admin | Admin rejects a submission |

### OCR Processing ✨ NEW
| Action | Logged By | Description |
|--------|-----------|-------------|
| `OCR_PROCESSED` | User/System | OCR processing completed on image |

### Research Operations
| Action | Logged By | Description |
|--------|-----------|-------------|
| `RESEARCH_ADDED` | User | Research item added to project |

### Project Operations
| Action | Logged By | Description |
|--------|-----------|-------------|
| `PROJECT_CREATED` | User | New project created |
| `PROJECT_ASSIGNED` | Admin | User assigned to project |

### Admin Operations
| Action | Logged By | Description |
|--------|-----------|-------------|
| `ADMIN_ROLE_GRANTED` | Admin | User promoted to admin |
| `ADMIN_ROLE_REVOKED` | Admin | Admin role revoked from user |
| `USER_DEACTIVATED` | Admin | User deactivated |

### System & Auditing
| Action | Logged By | Description |
|--------|-----------|-------------|
| `INTEGRITY_CHECK_PASSED` | Admin | Audit log integrity verification passed |
| `INTEGRITY_CHECK_FAILED` | Admin | Audit log integrity verification failed |

---

## Hash-Chain Verification System

### How It Works

The integrity check uses a deterministic hashing mechanism:

```
For each audit log:
  hash = SHA256(userId | action | metadata | timestamp | previousHash | sequence)
```

**Key Components:**
- `userId` - User who triggered the action
- `action` - Action name (any string, no fixed list)
- `metadata` - Contextual data about the action
- `timestamp` - ISO format timestamp
- `previousHash` - Hash of the previous log (creates chain)
- `sequence` - Sequential order number

### Why All Actions Are Supported

The hashing algorithm is **action-agnostic**:
- It can hash any action name
- It doesn't validate against a whitelist
- New actions automatically work without code changes
- The hash chain is tamper-evident

### Verification Process

When verifying integrity:

1. ✓ Start with genesis (previousHash = "GENESIS")
2. ✓ For each log in sequence order:
   - Recalculate hash using stored metadata
   - Compare recalculated hash with stored hash
   - Verify sequence order is correct
   - Verify hash chain continuity
3. ✓ Report if any log has been modified

---

## New Actions - Integration Details

### PDF_GENERATED
**File:** `backend/controllers/documentController.js` (line 57)

**Triggers When:**
- User generates a PDF from submission content

**Metadata Captured:**
```javascript
{
  projectId: string,
  submissionId: string,
  projectTitle: string,
  fileName: string,
  ipAddress: string,
  userAgent: string
}
```

### DOCUMENT_CONVERTED
**File:** `backend/controllers/documentController.js` (line 121)

**Triggers When:**
- User generates a Word document from submission content

**Metadata Captured:**
```javascript
{
  projectId: string,
  submissionId: string,
  projectTitle: string,
  fileName: string,
  documentType: "Word",
  ipAddress: string,
  userAgent: string
}
```

### DOCUMENT_SUBMITTED
**File:** `backend/controllers/submissionController.js` (line 144)

**Triggers When:**
- User submits a draft for admin review

**Metadata Captured:**
```javascript
{
  submissionId: string,
  projectId: string,
  projectTitle: string,
  status: "SUBMITTED",
  hasContent: boolean,
  hasPdfFile: boolean,
  hasWordFile: boolean,
  hasOriginalFile: boolean,
  ipAddress: string,
  userAgent: string
}
```

### DOCUMENT_REVIEWED
**File:** `backend/controllers/submissionController.js` (line 223)

**Triggers When:**
- Admin reviews a submitted document (always logged)

**Metadata Captured:**
```javascript
{
  submissionId: string,
  projectId: string,
  projectTitle: string,
  userId: string,
  userName: string,
  previousStatus: "SUBMITTED",
  newStatus: "APPROVED" | "REJECTED",
  feedback: string,
  ipAddress: string,
  userAgent: string
}
```

### DOCUMENT_APPROVED
**File:** `backend/controllers/submissionController.js` (line 231)

**Triggers When:**
- Admin approves a submission

**Metadata Captured:**
- Same as DOCUMENT_REVIEWED

### DOCUMENT_REJECTED
**File:** `backend/controllers/submissionController.js` (line 231)

**Triggers When:**
- Admin rejects a submission

**Metadata Captured:**
- Same as DOCUMENT_REVIEWED

### OCR_PROCESSED
**File:** `backend/controllers/ocrController.js` (line 56)

**Triggers When:**
- OCR processing completes on an image

**Metadata Captured:**
```javascript
{
  text: string,
  confidence: number,
  language: string,
  sourceFile: string,
  ipAddress: string,
  userAgent: string
}
```

---

## Hash Chain Integrity Verification

### Endpoint
```
GET /api/v1/logs/verify-integrity
```

### Authorization
- Admin role required
- Authentication required

### Response (Success)
```json
{
  "integrity": true,
  "message": "All audit logs verified successfully",
  "checked": 150,
  "legacyChecked": 5,
  "modernChecked": 145
}
```

### Response (Failure)
```json
{
  "integrity": false,
  "message": "Audit log hash mismatch",
  "failedAtSequence": 47,
  "failedAtTimestamp": "2025-04-03T10:35:22.000Z"
}
```

### What Gets Verified

✓ **Hash Chain Continuity**
- Each log's `previousHash` matches the previous log's `currentHash`
- Creates an unbreakable chain

✓ **Hash Correctness**
- Each log's `currentHash` is recalculated and verified
- Any change to userId, action, metadata, or timestamp breaks the hash

✓ **Sequence Order**
- Logs are in strictly increasing sequence
- No out-of-order logs

✓ **Legacy Log Compatibility**
- Older logs without sequence numbers verified using legacy algorithm
- Modern logs verified using modern algorithm with sequences
- Backward compatibility ensured

---

## Why No Hashing Logic Changes Were Needed

The existing hash verification system is designed to work with **any action name**:

1. **No Action Whitelist** - The code doesn't validate against a fixed list of allowed actions
2. **Generic Hash Function** - The hash includes the action string but doesn't restrict it
3. **Backward Compatible** - New actions are automatically supported
4. **Tamper-Evident** - Any modification to action names breaks the hash chain

### Example

```javascript
// Old logs with existing actions (before new features)
createLog(userId, "CONTENT_EDITED", metadata) ✓ Verified

// New logs with new actions (after adding document features)
createLog(userId, "PDF_GENERATED", metadata) ✓ Verified (same system)
createLog(userId, "DOCUMENT_SUBMITTED", metadata) ✓ Verified (same system)
createLog(userId, "DOCUMENT_APPROVED", metadata) ✓ Verified (same system)
```

All actions work through the same immutable hash chain.

---

## Testing the Integrity Check

### Step 1: Create Some Logs
- Perform actions (login, create content, generate documents, submit, review)
- Each action creates an audit log

### Step 2: Verify Integrity
```bash
curl -X GET http://localhost:8080/api/v1/logs/verify-integrity \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "X-CSRF-Token: CSRF_TOKEN"
```

### Step 3: Verify Results
- Should return `"integrity": true` if all logs are valid
- Returns `"integrity": false` if any log has been tampered with

---

## Complete Action List for Documentation

### Newly Added Actions (This Implementation)
- OCR_PROCESSED ✨
- PDF_GENERATED ✨
- DOCUMENT_CONVERTED ✨
- DOCUMENT_SUBMITTED ✨
- DOCUMENT_REVIEWED ✨
- DOCUMENT_APPROVED ✨
- DOCUMENT_REJECTED ✨

### Previously Existing Actions
- INVITE_SENT
- INVITE_ACCEPTED
- LOGIN_SUCCESS
- LOGIN_FAILED
- LOGOUT
- CONTENT_EDITED
- RESEARCH_ADDED
- PROJECT_CREATED
- PROJECT_ASSIGNED
- ADMIN_ROLE_GRANTED
- ADMIN_ROLE_REVOKED
- USER_DEACTIVATED
- INTEGRITY_CHECK_PASSED
- INTEGRITY_CHECK_FAILED

**Total: 21 documented actions** (7 new + 14 existing)

---

## Conclusion

✅ All new audit actions are automatically supported by the hash-chain integrity verification system

✅ No changes to hashing logic were required

✅ The immutable hash chain remains tamper-evident

✅ Backward compatibility with existing logs is maintained

✅ New actions are included in the integrity check verification process automatically

