# Document Generation API Reference

## Overview
Complete document generation pipeline for PDF and Word (.docx) formats from the same content, with full Tamil Unicode support.

## Endpoints

### 1. Generate PDF
```
POST /api/v1/documents/generate-pdf
```

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
X-CSRF-Token: <csrf_token>
```

**Request Body:**
```json
{
  "content": "Your text content here (up to 40,000 characters)",
  "projectId": "671a2c1e8f1e2e3e4e5e6e7e"
}
```

**Response (Success - 200):**
```json
{
  "msg": "PDF generated successfully",
  "fileUrl": "/documents/671a2c1e8f1e2e3e4e5e6e7e_1234567890.pdf",
  "fileName": "671a2c1e8f1e2e3e4e5e6e7e_1234567890.pdf",
  "submissionId": "581a2c1e8f1e2e3e4e5e6e7e"
}
```

---

### 2. Generate Word Document
```
POST /api/v1/documents/generate-word
```

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
X-CSRF-Token: <csrf_token>
```

**Request Body:**
```json
{
  "content": "Your text content here (up to 40,000 characters)",
  "projectId": "671a2c1e8f1e2e3e4e5e6e7e"
}
```

**Response (Success - 200):**
```json
{
  "msg": "Word document generated successfully",
  "fileUrl": "/documents/671a2c1e8f1e2e3e4e5e6e7e_1234567890.docx",
  "fileName": "671a2c1e8f1e2e3e4e5e6e7e_1234567890.docx",
  "submissionId": "581a2c1e8f1e2e3e4e5e6e7e"
}
```

---

### 3. Generate Both Documents
```
POST /api/v1/documents/generate-both
```

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
X-CSRF-Token: <csrf_token>
```

**Request Body:**
```json
{
  "content": "Your text content here (up to 40,000 characters)",
  "projectId": "671a2c1e8f1e2e3e4e5e6e7e"
}
```

**Response (Success - 200):**
```json
{
  "msg": "Both documents generated successfully",
  "documents": {
    "pdf": {
      "fileUrl": "/documents/671a2c1e8f1e2e3e4e5e6e7e_1234567890.pdf",
      "fileName": "671a2c1e8f1e2e3e4e5e6e7e_1234567890.pdf"
    },
    "word": {
      "fileUrl": "/documents/671a2c1e8f1e2e3e4e5e6e7e_1234567890.docx",
      "fileName": "671a2c1e8f1e2e3e4e5e6e7e_1234567890.docx"
    }
  },
  "submissionId": "581a2c1e8f1e2e3e4e5e6e7e"
}
```

---

### 4. Get Submission Documents
```
GET /api/v1/documents/:submissionId
```

**Request Headers:**
```
Authorization: Bearer <token>
X-CSRF-Token: <csrf_token>
```

**Example:**
```
GET /api/v1/documents/581a2c1e8f1e2e3e4e5e6e7e
```

**Response (Success - 200):**
```json
{
  "submissionId": "581a2c1e8f1e2e3e4e5e6e7e",
  "projectId": "671a2c1e8f1e2e3e4e5e6e7e",
  "projectTitle": "Research Project Title",
  "documents": {
    "pdf": "/documents/671a2c1e8f1e2e3e4e5e6e7e_1234567890.pdf",
    "word": "/documents/671a2c1e8f1e2e3e4e5e6e7e_1234567890.docx"
  },
  "createdAt": "2025-04-03T10:30:00.000Z"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "msg": "Content cannot be empty"
}
```

### 401 Unauthorized
```json
{
  "msg": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "msg": "Not authorized for this project"
}
```

### 404 Not Found
```json
{
  "msg": "Project not found"
}
```

---

## Key Features

✅ **Complete Content Preservation:**
- Both PDF and Word documents are generated from the SAME content
- No conversion between formats (PDF → Word conversion is NOT performed)
- Ensures 100% fidelity of content

✅ **Full Language Support:**
- Complete Tamil Unicode support
- UTF-8 encoding for all documents
- Proper character rendering for all languages

✅ **Document Quality:**
- Professional formatting with margins, headers, and footers
- Proper pagination and page numbers
- Responsive paragraph formatting

✅ **Security:**
- User authentication required
- Project access validation
- CSRF token protection
- Audit logging for all document generation events

✅ **Audit Logging:**
- `PDF_GENERATED` - Logged when PDF is created
- `DOCUMENT_CONVERTED` - Logged when Word document is created
- Complete metadata tracking (projectId, submissionId, fileName, etc.)

---

## File Storage

Generated documents are stored in: `/backend/documents/`

Files are named with format: `{projectId}_{timestamp}.{extension}`
- Example: `671a2c1e8f1e2e3e4e5e6e7e_1704192000000.pdf`

---

## Usage Example (cURL)

```bash
# Generate PDF
curl -X POST http://localhost:8080/api/v1/documents/generate-pdf \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d '{
    "content": "Your content here",
    "projectId": "671a2c1e8f1e2e3e4e5e6e7e"
  }'

# Generate Both
curl -X POST http://localhost:8080/api/v1/documents/generate-both \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -d '{
    "content": "Your content here",
    "projectId": "671a2c1e8f1e2e3e4e5e6e7e"
  }'

# Download PDF
curl -O "http://localhost:8080/documents/671a2c1e8f1e2e3e4e5e6e7e_1704192000000.pdf"
```

---

## Submission Model Changes

The `Submission` model now includes:
- `fileUrlPDF` - URL to generated PDF document
- `fileUrlWord` - URL to generated Word document

These fields are automatically populated when documents are generated.

