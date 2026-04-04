# Backend API Documentation

## Overview

Complete REST API implementation for document generation, submission workflow, and admin review system.

---

## Base URL
```
http://localhost:8080/api/v1
```

All endpoints require authentication via JWT token in cookies.

---

## Authentication

### Login
**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "USER"
  },
  "message": "Login successful"
}
```

---

## Document Generation APIs

### 1. Generate PDF Document
**Endpoint:** `POST /documents/generate-pdf`

**Authentication:** ✅ Required

**Authorization:** Any authenticated user

**Request Body:**
```json
{
  "content": "Document content goes here. Can be up to 40,000 characters.",
  "projectId": "project_id_here"
}
```

**Validation:**
- `content` - Required, 1-40,000 characters
- `projectId` - Required, valid MongoDB ObjectId

**Response (Success):**
```json
{
  "message": "PDF generated successfully",
  "fileUrlPDF": "/documents/pdf_1234567890_abc.pdf",
  "submission": {
    "_id": "submission_id",
    "projectId": "project_id",
    "content": "Document content...",
    "fileUrlPDF": "/documents/pdf_1234567890_abc.pdf",
    "fileUrl": null,
    "fileUrlWord": null,
    "status": "DRAFT",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  },
  "auditLog": {
    "action": "PDF_GENERATED",
    "timestamp": "2024-01-15T10:35:00.000Z"
  }
}
```

**Response (Error):**
```json
{
  "error": "Project not found or access denied",
  "statusCode": 404
}
```

**Audit Log Created:**
- Action: `PDF_GENERATED`
- Metadata: `{ fileSize: 2934, fileName: "pdf_..." }`

---

### 2. Generate Word Document
**Endpoint:** `POST /documents/generate-word`

**Authentication:** ✅ Required

**Authorization:** Any authenticated user

**Request Body:**
```json
{
  "content": "Document content goes here. Can be up to 40,000 characters.",
  "projectId": "project_id_here"
}
```

**Validation:** Same as PDF

**Response (Success):**
```json
{
  "message": "Word document generated successfully",
  "fileUrlWord": "/documents/word_1234567890_abc.docx",
  "submission": {
    "_id": "submission_id",
    "projectId": "project_id",
    "content": "Document content...",
    "fileUrlPDF": null,
    "fileUrl": null,
    "fileUrlWord": "/documents/word_1234567890_abc.docx",
    "status": "DRAFT",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:37:00.000Z"
  },
  "auditLog": {
    "action": "DOCUMENT_CONVERTED",
    "timestamp": "2024-01-15T10:37:00.000Z"
  }
}
```

**Audit Log Created:**
- Action: `DOCUMENT_CONVERTED`
- Metadata: `{ fileSize: 8782, fileName: "word_..." }`

---

### 3. Generate Both PDF and Word
**Endpoint:** `POST /documents/generate-both`

**Authentication:** ✅ Required

**Authorization:** Any authenticated user

**Request Body:**
```json
{
  "content": "Document content goes here. Can be up to 40,000 characters.",
  "projectId": "project_id_here"
}
```

**Validation:** Same as PDF

**Response (Success):**
```json
{
  "message": "Both PDF and Word documents generated successfully",
  "fileUrlPDF": "/documents/pdf_1234567890_abc.pdf",
  "fileUrlWord": "/documents/word_1234567890_abc.docx",
  "submission": {
    "_id": "submission_id",
    "projectId": "project_id",
    "content": "Document content...",
    "fileUrlPDF": "/documents/pdf_1234567890_abc.pdf",
    "fileUrl": null,
    "fileUrlWord": "/documents/word_1234567890_abc.docx",
    "status": "DRAFT",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:39:00.000Z"
  },
  "auditLogs": [
    {
      "action": "PDF_GENERATED",
      "timestamp": "2024-01-15T10:39:00.000Z"
    },
    {
      "action": "DOCUMENT_CONVERTED",
      "timestamp": "2024-01-15T10:39:01.000Z"
    }
  ]
}
```

**Audit Logs Created:**
- Action: `PDF_GENERATED` - PDF file generation
- Action: `DOCUMENT_CONVERTED` - Word file generation

---

### 4. Get Submission Documents
**Endpoint:** `GET /documents/:submissionId`

**Authentication:** ✅ Required

**Authorization:** Submission creator or admin

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| submissionId | string | ✅ | MongoDB ObjectId of submission |

**Response (Success):**
```json
{
  "fileUrlPDF": "/documents/pdf_1234567890_abc.pdf",
  "fileUrlWord": "/documents/word_1234567890_abc.docx",
  "fileUrl": null,
  "submission": {
    "_id": "submission_id",
    "status": "DRAFT",
    "content": "Document content...",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response (Error):**
```json
{
  "error": "Submission not found",
  "statusCode": 404
}
```

---

## Submission APIs

### 1. Create or Update Draft Submission
**Endpoint:** `POST /submissions`

**Authentication:** ✅ Required

**Authorization:** Any authenticated user

**Request Body:**
```json
{
  "projectId": "project_id_here",
  "content": "Draft content goes here"
}
```

**Validation:**
- `projectId` - Required, valid MongoDB ObjectId
- `content` - Optional, max 40,000 characters

**Response (Success):**
```json
{
  "message": "Submission created/updated successfully",
  "submission": {
    "_id": "submission_id",
    "userId": "user_id",
    "projectId": "project_id",
    "content": "Draft content...",
    "status": "DRAFT",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:05:00.000Z"
  }
}
```

---

### 2. Get Project Submissions
**Endpoint:** `GET /submissions/:projectId`

**Authentication:** ✅ Required

**Authorization:** Project members only

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| projectId | string | ✅ | MongoDB ObjectId of project |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number for pagination |
| limit | number | 10 | Records per page |

**Response (Success):**
```json
{
  "submissions": [
    {
      "_id": "submission_id",
      "userId": "user_id",
      "projectId": "project_id",
      "content": "Content...",
      "fileUrl": null,
      "fileUrlPDF": "/documents/pdf_...",
      "fileUrlWord": "/documents/word_...",
      "status": "DRAFT",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    }
  ],
  "totalPages": 5,
  "currentPage": 1
}
```

---

### 3. Submit for Review
**Endpoint:** `POST /submissions/:submissionId/submit`

**Authentication:** ✅ Required

**Authorization:** Submission creator only

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| submissionId | string | ✅ | MongoDB ObjectId of submission |

**Request Body:**
```json
{}
```

**Validation:**
- Submission must have at least one of: content, fileUrlPDF, fileUrlWord, fileUrl
- Submission must belong to authenticated user
- Submission must be in DRAFT status

**Response (Success):**
```json
{
  "message": "Submission submitted successfully for review",
  "submission": {
    "_id": "submission_id",
    "status": "SUBMITTED",
    "userId": "user_id",
    "projectId": "project_id",
    "content": "Content...",
    "fileUrlPDF": "/documents/pdf_...",
    "fileUrlWord": "/documents/word_...",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:40:00.000Z"
  },
  "auditLog": {
    "action": "DOCUMENT_SUBMITTED",
    "timestamp": "2024-01-15T10:40:00.000Z",
    "metadata": {
      "hasContent": true,
      "hasPDF": true,
      "hasWord": true,
      "hasOriginalFile": false
    }
  }
}
```

**Response (Error):**
```json
{
  "error": "Cannot submit without content or generated files",
  "statusCode": 400
}
```

**Audit Log Created:**
- Action: `DOCUMENT_SUBMITTED`
- Metadata: File existence flags (hasContent, hasPDF, hasWord, hasOriginalFile)

**Possible Errors:**
- `400` - Submission missing content/files
- `401` - Not authenticated
- `403` - Not submission owner
- `404` - Submission not found

---

### 4. Review Submission (Admin)
**Endpoint:** `POST /submissions/:submissionId/review`

**Authentication:** ✅ Required

**Authorization:** Admin only (role === "ADMIN")

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| submissionId | string | ✅ | MongoDB ObjectId of submission |

**Request Body:**
```json
{
  "status": "APPROVED",
  "feedback": "Great work! The document is well-structured and content is clear."
}
```

**Validation:**
- `status` - Required, enum: "APPROVED" or "REJECTED"
- `feedback` - Optional, 0-5000 characters
- Submission must be in SUBMITTED status
- User must have ADMIN role

**Response (Success - APPROVED):**
```json
{
  "message": "Submission approved successfully",
  "submission": {
    "_id": "submission_id",
    "status": "APPROVED",
    "feedback": "Great work!...",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  },
  "auditLogs": [
    {
      "action": "DOCUMENT_REVIEWED",
      "timestamp": "2024-01-15T11:00:00.000Z"
    },
    {
      "action": "DOCUMENT_APPROVED",
      "timestamp": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

**Response (Success - REJECTED):**
```json
{
  "message": "Submission rejected successfully",
  "submission": {
    "_id": "submission_id",
    "status": "REJECTED",
    "feedback": "Please revise...",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  },
  "auditLogs": [
    {
      "action": "DOCUMENT_REVIEWED",
      "timestamp": "2024-01-15T11:00:00.000Z"
    },
    {
      "action": "DOCUMENT_REJECTED",
      "timestamp": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

**Response (Error):**
```json
{
  "error": "Only admins can review submissions",
  "statusCode": 403
}
```

**Audit Logs Created (3 entries):**
1. Action: `DOCUMENT_REVIEWED` - Log that submission was reviewed
2. Action: `DOCUMENT_APPROVED` - Log if approved (or REJECTED if rejected)
3. Additional metadata with reviewer details

**Possible Errors:**
- `400` - Invalid status or submission not SUBMITTED
- `401` - Not authenticated
- `403` - Not an admin
- `404` - Submission not found
- `500` - Database error

---

## Audit Log APIs

### 1. Get All Audit Logs (Admin)
**Endpoint:** `GET /logs/all`

**Authentication:** ✅ Required

**Authorization:** Admin only

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| action | string | - | Filter by action type |
| page | number | 1 | Page number for pagination |
| limit | number | 20 | Records per page |

**Example Request:**
```
GET /logs/all?action=PDF_GENERATED&page=1&limit=20
```

**Response (Success):**
```json
{
  "logs": [
    {
      "_id": "log_id",
      "userId": "user_id",
      "action": "PDF_GENERATED",
      "timestamp": "2024-01-15T10:35:00.000Z",
      "metadata": {
        "fileSize": 2934,
        "fileName": "pdf_1234567890_abc.pdf"
      },
      "sequence": 42,
      "hash": "a1b2c3d4e5f6...",
      "createdAt": "2024-01-15T10:35:00.000Z"
    }
  ],
  "totalPages": 5,
  "currentPage": 1,
  "total": 95
}
```

**Available Actions for Filtering:**
- PDF_GENERATED
- DOCUMENT_CONVERTED
- DOCUMENT_SUBMITTED
- DOCUMENT_REVIEWED
- DOCUMENT_APPROVED
- DOCUMENT_REJECTED
- OCR_PROCESSED
- CONTENT_EDITED
- LOGIN_SUCCESS
- LOGIN_FAILED
- And more...

---

### 2. Verify Audit Log Integrity
**Endpoint:** `GET /logs/verify-integrity`

**Authentication:** ✅ Required

**Authorization:** Admin only

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 100 | Number of recent logs to verify |

**Response (Success - Valid Chain):**
```json
{
  "status": "VALID",
  "message": "All audit logs are valid and unmodified. Hash chain verification passed.",
  "logsVerified": 95,
  "checkpoints": [
    {
      "sequence": 1,
      "status": "VALID",
      "hash": "first_hash..."
    },
    {
      "sequence": 50,
      "status": "VALID",
      "hash": "checkpoint_hash..."
    },
    {
      "sequence": 95,
      "status": "VALID",
      "hash": "latest_hash..."
    }
  ]
}
```

**Response (Error - Invalid Chain):**
```json
{
  "status": "INVALID",
  "message": "Hash chain integrity compromised at sequence 52",
  "failedSequence": 52,
  "expected": "expected_hash...",
  "actual": "actual_hash...",
  "logsVerified": 51
}
```

---

## Document File Download

Files are served statically from `/documents` directory.

**Example URL:**
```
GET /documents/pdf_1234567890_abc.pdf
GET /documents/word_1234567890_abc.docx
```

**File Format:**
- PDF: UTF-8 encoded, A4 size, includes headers/footers
- Word: Unicode support, professional styling

---

## Error Responses

### Standard Error Format

**HTTP 400 - Bad Request:**
```json
{
  "error": "Validation error message",
  "details": ["Missing required field: content"]
}
```

**HTTP 401 - Unauthorized:**
```json
{
  "error": "Authentication required",
  "message": "Please log in to continue"
}
```

**HTTP 403 - Forbidden:**
```json
{
  "error": "Access denied",
  "message": "You do not have permission to access this resource"
}
```

**HTTP 404 - Not Found:**
```json
{
  "error": "Resource not found",
  "resource": "Submission"
}
```

**HTTP 500 - Internal Server Error:**
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred. Please try again later."
}
```

---

## Testing the APIs

### cURL Examples

**Generate PDF:**
```bash
curl -X POST http://localhost:8080/api/v1/documents/generate-pdf \
  -H "Content-Type: application/json" \
  -b "token=your_jwt_token" \
  -d '{
    "content": "Test content for PDF generation",
    "projectId": "your_project_id"
  }'
```

**Submit for Review:**
```bash
curl -X POST http://localhost:8080/api/v1/submissions/your_submission_id/submit \
  -H "Content-Type: application/json" \
  -b "token=your_jwt_token" \
  -d '{}'
```

**Admin Review - Approve:**
```bash
curl -X POST http://localhost:8080/api/v1/submissions/your_submission_id/review \
  -H "Content-Type: application/json" \
  -b "token=your_admin_token" \
  -d '{
    "status": "APPROVED",
    "feedback": "Looks good!"
  }'
```

**Verify Integrity:**
```bash
curl -X GET http://localhost:8080/api/v1/logs/verify-integrity \
  -b "token=your_admin_token"
```

---

## Rate Limiting

All endpoints are subject to rate limiting:
- 100 requests per 15 minutes (shared pool)
- Document generation may consume additional quota

---

## CORS and Security

- CSRF protection: Required for state-changing requests
- CORS: Enabled for frontend origin
- Authentication: JWT token in cookies
- Authorization: Role-based access control

---

## Version History

- **v1.0** (2024-01-15)
  - Initial document generation APIs
  - Submission workflow APIs
  - Admin review APIs
  - Audit log endpoints

