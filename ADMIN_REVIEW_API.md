# Admin Review API Documentation

## Overview
Complete admin review functionality for submissions. Admins can approve or reject submitted documents with optional feedback.

---

## Review Submission Endpoint

### `POST /api/v1/submissions/:submissionId/review`

Review a submitted submission - approve or reject with optional feedback.

**Request Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
X-CSRF-Token: <csrf_token>
```

**Request Parameters:**
```
submissionId: MongoDB ObjectId (from URL path)
```

**Request Body:**
```json
{
  "status": "APPROVED",
  "feedback": "Excellent work! This research is comprehensive and well-documented."
}
```

**Body Fields:**
- `status` (required): `"APPROVED"` or `"REJECTED"`
- `feedback` (optional): Max 5000 characters - admin's review feedback

**Response (Success - 200):**
```json
{
  "msg": "Submission successfully approved",
  "submission": {
    "_id": "581a2c1e8f1e2e3e4e5e6e7e",
    "projectId": {
      "_id": "671a2c1e8f1e2e3e4e5e6e7e",
      "title": "Research Project"
    },
    "userId": {
      "_id": "781a2c1e8f1e2e3e4e5e6e7e",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "USER"
    },
    "content": "Full submission content...",
    "fileUrlPDF": "/documents/671a2c1e8f1e2e3e4e5e6e7e_1234567890.pdf",
    "fileUrlWord": "/documents/671a2c1e8f1e2e3e4e5e6e7e_1234567890.docx",
    "status": "APPROVED",
    "createdAt": "2025-04-03T10:15:00.000Z",
    "updatedAt": "2025-04-03T10:35:00.000Z"
  }
}
```

---

## Error Responses

### 400 Bad Request - Invalid Status
```json
{
  "msg": "Status must be APPROVED or REJECTED"
}
```

### 400 Bad Request - Invalid Submission State
```json
{
  "msg": "Cannot review submission with status: DRAFT. Only SUBMITTED submissions can be reviewed."
}
```

### 401 Unauthorized
```json
{
  "msg": "Not authenticated"
}
```

### 403 Forbidden - Not Admin
```json
{
  "msg": "Only admins can review submissions"
}
```

### 404 Not Found
```json
{
  "msg": "Submission not found"
}
```

---

## Permissions & Authorization

✅ **Admin Only:**
- Only users with role `ADMIN` can review submissions
- Regular users will receive 403 Forbidden response

✅ **Submission State:**
- Only submissions with status `SUBMITTED` can be reviewed
- Cannot review submissions in `DRAFT`, `APPROVED`, or `REJECTED` states

---

## Validation Rules

✅ **Status Field:**
- Must be either `"APPROVED"` or `"REJECTED"` (case-sensitive)
- Required field

✅ **Feedback Field:**
- Optional
- Maximum 5000 characters
- Trimmed of whitespace

✅ **Submission ID:**
- Must be a valid MongoDB ObjectId

---

## Status Flow

```
DRAFT
  ↓
SUBMITTED (user submits)
  ↓
APPROVED or REJECTED (admin reviews)
  ↓
[Final Status]
```

---

## Audit Logging

Three audit log entries are created during review:

### 1. General Review Log
**Action:** `DOCUMENT_REVIEWED`
- Logged for every submission review
- Tracks that a review action occurred

### 2. Approval Log
**Action:** `DOCUMENT_APPROVED`
- Only logged if status is `APPROVED`

### 3. Rejection Log
**Action:** `DOCUMENT_REJECTED`
- Only logged if status is `REJECTED`

### Metadata Captured (all logs):
- `submissionId` - ID of reviewed submission
- `projectId` - Associated project
- `projectTitle` - Project title
- `userId` - Original submitter's ID
- `userName` - Original submitter's name
- `previousStatus` - Status before review (SUBMITTED)
- `newStatus` - Final status (APPROVED/REJECTED)
- `feedback` - Admin's feedback text
- `ipAddress` - Admin's IP address
- `userAgent` - Admin's user agent
- `timestamp` - Review time

---

## Workflow

### Step 1: User Creates & Submits
```bash
POST /api/v1/submissions
POST /api/v1/documents/generate-both
POST /api/v1/submissions/:id/submit
```

### Step 2: Admin Reviews
```bash
POST /api/v1/submissions/:id/review
{
  "status": "APPROVED",
  "feedback": "Excellent submission!"
}
```

### Step 3: Final Status
Submission status becomes `APPROVED` or `REJECTED`

---

## Usage Example (cURL)

### Approve Submission
```bash
curl -X POST http://localhost:8080/api/v1/submissions/581a2c1e8f1e2e3e4e5e6e7e/review \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: CSRF_TOKEN" \
  -d '{
    "status": "APPROVED",
    "feedback": "Great work on this research paper!"
  }'
```

### Reject Submission
```bash
curl -X POST http://localhost:8080/api/v1/submissions/581a2c1e8f1e2e3e4e5e6e7e/review \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: CSRF_TOKEN" \
  -d '{
    "status": "REJECTED",
    "feedback": "Please revise the methodology and resubmit."
  }'
```

---

## Usage Example (JavaScript/Axios)

```javascript
import axios from 'axios';

async function reviewSubmission(submissionId, status, feedback, adminToken) {
  try {
    const response = await axios.post(
      `/api/v1/submissions/${submissionId}/review`,
      {
        status,
        feedback
      },
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        }
      }
    );
    
    console.log('Review submitted:', response.data);
    return response.data;
  } catch (error) {
    console.error('Review failed:', error.response?.data?.msg);
    throw error;
  }
}

// Usage - Approve
reviewSubmission(
  '581a2c1e8f1e2e3e4e5e6e7e',
  'APPROVED',
  'Excellent work!',
  adminToken
);

// Usage - Reject
reviewSubmission(
  '581a2c1e8f1e2e3e4e5e6e7e',
  'REJECTED',
  'Please revise and resubmit.',
  adminToken
);
```

---

## Key Features

✅ **Admin-Only Access**
- Role-based authorization ensures only admins can review
- Regular users cannot access this endpoint

✅ **Structured Status Updates**
- Only SUBMITTED submissions can be reviewed
- Prevents review of drafts or already-reviewed submissions
- Clear workflow enforcement

✅ **Feedback Support**
- Optional admin feedback can be recorded per review
- Helps users understand review decisions
- Stored for audit trail

✅ **Comprehensive Audit Trail**
- Multiple audit log entries per review
- Captures both general and specific actions
- Full metadata for complete audit history

✅ **Clear Error Messages**
- Helps admins understand what went wrong
- Guides through valid states and statuses

✅ **Atomic Operations**
- Status update and logging are coordinated
- Consistent state across all records

---

## Response Messages

**Approval:**
```
"Submission successfully approved"
```

**Rejection:**
```
"Submission successfully rejected"
```

---

## Complete Submission Lifecycle

```
1. CREATE DRAFT
   POST /submissions
   Status: DRAFT

2. EDIT CONTENT
   POST /submissions
   Status: DRAFT

3. GENERATE DOCUMENTS
   POST /documents/generate-pdf
   POST /documents/generate-word
   POST /documents/generate-both
   Status: DRAFT (unchanged)

4. SUBMIT SUBMISSION
   POST /submissions/:id/submit
   Status: SUBMITTED

5. ADMIN REVIEW
   POST /submissions/:id/review
   Status: APPROVED or REJECTED

6. FINAL STATE
   Submission is either approved or rejected
```

