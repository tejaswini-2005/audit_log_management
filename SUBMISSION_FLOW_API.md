# Submission Flow API Documentation

## Overview
Complete submission flow for marking drafts as submitted with validation for content and generated files.

---

## Submit Submission Endpoint

### `POST /api/v1/submissions/:submissionId/submit`

Submit a draft submission as final submission. Ensures that content or generated files exist before submission.

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
X-CSRF-Token: <csrf_token>
```

**Request Parameters:**
```
submissionId: MongoDB ObjectId (from URL path)
```

**Request Body:**
```json
{}
```
(Empty body - no input required)

**Response (Success - 200):**
```json
{
  "msg": "Submission successfully submitted",
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
    "content": "Full submission content here...",
    "fileUrl": "https://example.com/original-file.pdf",
    "fileUrlPDF": "/documents/671a2c1e8f1e2e3e4e5e6e7e_1234567890.pdf",
    "fileUrlWord": "/documents/671a2c1e8f1e2e3e4e5e6e7e_1234567890.docx",
    "status": "SUBMITTED",
    "createdAt": "2025-04-03T10:15:00.000Z",
    "updatedAt": "2025-04-03T10:30:00.000Z"
  }
}
```

---

## Error Responses

### 400 Bad Request - Missing Content/Files
```json
{
  "msg": "Cannot submit: no content or generated files exist. Please add content and generate documents first."
}
```

### 401 Unauthorized
```json
{
  "msg": "Not authenticated"
}
```

### 403 Forbidden - Not Authorized
```json
{
  "msg": "Not authorized to submit this submission"
}
```

### 404 Not Found
```json
{
  "msg": "Submission not found"
}
```

---

## Validation Rules

✅ **Content Requirement:**
- Must have at least ONE of the following:
  - `content` (text content - min 1 character)
  - `fileUrlPDF` (generated PDF document)
  - `fileUrlWord` (generated Word document)
  - `fileUrl` (original uploaded file)

✅ **Authorization:**
- Only the user who created the submission can submit it
- Cannot submit submissions created by other users

✅ **Input Validation:**
- Submission ID must be a valid MongoDB ObjectId

---

## Workflow

### Step 1: Create Draft
```bash
POST /api/v1/submissions
{
  "projectId": "671a2c1e8f1e2e3e4e5e6e7e",
  "content": "Your draft content here..."
}
```

### Step 2: Generate Documents (Optional)
```bash
POST /api/v1/documents/generate-pdf
{
  "projectId": "671a2c1e8f1e2e3e4e5e6e7e",
  "content": "Your content here..."
}

POST /api/v1/documents/generate-word
{
  "projectId": "671a2c1e8f1e2e3e4e5e6e7e",
  "content": "Your content here..."
}

OR

POST /api/v1/documents/generate-both
{
  "projectId": "671a2c1e8f1e2e3e4e5e6e7e",
  "content": "Your content here..."
}
```

### Step 3: Submit Submission
```bash
POST /api/v1/submissions/581a2c1e8f1e2e3e4e5e6e7e/submit
```

---

## Submission Statuses

| Status | Description |
|--------|-------------|
| `DRAFT` | Submission is in draft form, not yet submitted |
| `SUBMITTED` | Submission has been formally submitted |
| `APPROVED` | Admin has approved the submission |
| `REJECTED` | Admin has rejected the submission |

---

## Audit Logging

When a submission is submitted, an audit log entry is created with:

**Action:** `DOCUMENT_SUBMITTED`

**Metadata captured:**
- `submissionId` - The ID of the submitted submission
- `projectId` - The project to which submission belongs
- `projectTitle` - Title of the project
- `status` - Final status (SUBMITTED)
- `hasContent` - Boolean: whether content exists
- `hasPdfFile` - Boolean: whether PDF document exists
- `hasWordFile` - Boolean: whether Word document exists
- `hasOriginalFile` - Boolean: whether original file exists
- `ipAddress` - Client IP address
- `userAgent` - Client user agent
- `timestamp` - When the submission occurred

---

## Usage Example (cURL)

```bash
# Submit a submission
curl -X POST http://localhost:8080/api/v1/submissions/581a2c1e8f1e2e3e4e5e6e7e/submit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN"
```

---

## Usage Example (JavaScript/Axios)

```javascript
import axios from 'axios';

async function submitSubmission(submissionId, token) {
  try {
    const response = await axios.post(
      `/api/v1/submissions/${submissionId}/submit`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        }
      }
    );
    
    console.log('Submission successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('Submission failed:', error.response?.data?.msg);
    throw error;
  }
}

// Usage
submitSubmission('581a2c1e8f1e2e3e4e5e6e7e', authToken)
  .then(result => console.log(result))
  .catch(err => console.error(err));
```

---

## Key Features

✅ **Content Validation**
- Requires at least one form of content before submission
- Supports multiple file formats

✅ **Security**
- User authentication required
- Ownership verification (only creator can submit)
- CSRF token protection

✅ **Comprehensive Audit Trail**
- Complete logging of submission events
- Tracks all file types present
- Records request metadata (IP, user agent, etc.)

✅ **Clear Error Messages**
- Descriptive messages for validation failures
- Helps guide users to complete their submission

✅ **Data Integrity**
- Transactional updates
- Consistent status tracking
- Full audit history

