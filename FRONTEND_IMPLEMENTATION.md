# Frontend React Components Documentation

## Overview

Complete React frontend implementation for document management, submission workflow, and admin review system.

---

## User Components

### 1. Content Editor (`ContentEditor.jsx`)
**Location:** `frontend/src/pages/user/ContentEditor.jsx`

**Purpose:** Manual content editing and OCR text extraction

**Features:**
- ✅ OCR image/PDF upload
- ✅ Text extraction with page-by-page preview
- ✅ Manual content editing in textarea
- ✅ Draft auto-save with project selection
- ✅ Tamil + English language support

**States:**
- `selectedProjectId` - Currently selected project
- `draft` - Current draft content
- `pages` - OCR extracted pages
- `status` - User feedback messages

**API Calls:**
- `GET /projects` - Fetch available projects
- `GET /submissions/{projectId}` - Load draft
- `POST /submissions` - Save draft
- `POST /ocr/extract-text` - Extract text from images/PDFs

**Styling:** Glass card layout with stats grid

---

### 2. Submission Page (`Submission.jsx`)
**Location:** `frontend/src/pages/user/Submission.jsx`

**Purpose:** Document generation and submission workflow

**Features:**
- ✅ Project selection
- ✅ Submission status display
- ✅ PDF document generation
- ✅ Word document generation
- ✅ Generate both simultaneously
- ✅ Submit for admin review
- ✅ Document preview and download
- ✅ Content preview

**States:**
- `selectedProjectId` - Selected project
- `submission` - Current submission object
- `generatingPdf` - PDF generation in progress
- `generatingWord` - Word generation in progress
- `submitting` - Submission in progress

**API Calls:**
- `GET /projects` - Fetch projects
- `GET /submissions/{projectId}` - Load submission
- `POST /documents/generate-pdf` - Generate PDF
- `POST /documents/generate-word` - Generate Word
- `POST /documents/generate-both` - Generate both
- `POST /submissions/{submissionId}/submit` - Submit for review

**User Flow:**
1. Edit content in ContentEditor
2. Navigate to Submission page
3. Generate PDF/Word documents
4. Submit for admin review

**Styling:** Grid layout with document cards

---

---

## Admin Components

### 3. Submission Review Page (`SubmissionReview.jsx`)
**Location:** `frontend/src/pages/admin/SubmissionReview.jsx`

**Purpose:** Review, approve, or reject user submissions

**Features:**
- ✅ List submissions pending review
- ✅ View submission details
- ✅ Download PDF/Word documents
- ✅ View content preview
- ✅ Add approval/rejection feedback
- ✅ Approve submission with feedback
- ✅ Reject submission with feedback
- ✅ Real-time status updates

**States:**
- `submissions` - Array of submitted submissions
- `selectedSubmission` - Currently reviewing submission
- `feedback` - Admin's feedback text
- `reviewing` - Review action in progress
- `integrityStatus` - Audit chain status

**API Calls:**
- `GET /submissions` - Fetch all submissions
- `POST /submissions/{submissionId}/review` - Submit review with status

**Review Workflow:**
1. View list of submitted submissions
2. Select a submission to review
3. View user details and content
4. Download and review documents
5. Add optional feedback
6. Approve or reject

**Styling:** Two-column layout with timeline list

---

### 4. Audit Logs Viewer (`AuditLogsViewer.jsx`)
**Location:** `frontend/src/pages/admin/AuditLogsViewer.jsx`

**Purpose:** View and verify audit logs with integrity checking

**Features:**
- ✅ View audit logs with pagination
- ✅ Filter by action type
- ✅ Verify hash-chain integrity
- ✅ Display verification status
- ✅ Show log details (user, timestamp, hash)
- ✅ Support for all audit actions:
  - PDF_GENERATED
  - DOCUMENT_CONVERTED
  - DOCUMENT_SUBMITTED
  - DOCUMENT_REVIEWED
  - DOCUMENT_APPROVED
  - DOCUMENT_REJECTED
  - OCR_PROCESSED
  - CONTENT_EDITED
  - LOGIN_SUCCESS/FAILED
  - And more...

**States:**
- `logs` - Array of audit logs
- `filteredLogs` - Filtered audit logs
- `actionFilter` - Current action filter
- `page` - Current pagination page
- `integrityStatus` - Result of integrity check

**API Calls:**
- `GET /logs/all` - Fetch audit logs with pagination
- `GET /logs/verify-integrity` - Verify audit chain integrity

**Audit Log Details:**
- Action type
- User email
- Timestamp
- Sequence number
- Hash (first 16 chars displayed)

**Styling:** Glass card layout with timeline list

---

## Navigation

### Updated Navbar (`Navbar.jsx`)
**Location:** `frontend/src/components/Navbar.jsx`

**Navigation Links:**

**For All Users:**
- Dashboard
- Content Editor
- Submission
- Projects
- My Logs

**Admin-Only Links:**
- Review Submissions
- Audit Logs
- All Logs
- Invite User
- Research

---

## Routing

### New Routes Added to App.jsx

**User Routes:**
```
/dashboard/content       → ContentEditor (already existed)
/dashboard/submission    → Submission (NEW)
```

**Admin-Only Routes:**
```
/dashboard/submission-review   → SubmissionReview (NEW)
/dashboard/audit-logs          → AuditLogsViewer (NEW)
```

---

## Complete User Workflow

### 1. Content Creation - User
```
1. User logs in → Dashboard
2. Navigate to "Content Editor"
3. Select project
4. Upload image/PDF
5. Extract text with OCR
6. Edit text manually
7. Save draft
```

### 2. Document Generation - User
```
1. Navigate to "Submission"
2. Select project
3. View draft content
4. Generate PDF document
5. Generate Word document (or both at once)
6. Download documents for preview
7. Submit for admin review
```

### 3. Admin Review - Admin
```
1. Admin logs in → Dashboard
2. Navigate to "Review Submissions"
3. View list of pending submissions
4. Select submission to review
5. View user details and content
6. Download PDF/Word documents
7. Add feedback (optional)
8. Approve or Reject
```

### 4. Audit Trail - Admin
```
1. Navigate to "Audit Logs"
2. Filter by action type (PDF_GENERATED, DOCUMENT_SUBMITTED, etc.)
3. View action details with timestamps
4. Click "Verify Integrity" to check hash chain
5. Confirm all logs are valid and unmodified
```

---

## Component File Sizes

| Component | Lines | File |
|-----------|-------|------|
| ContentEditor | 300+ | frontend/src/pages/user/ContentEditor.jsx |
| Submission | 280+ | frontend/src/pages/user/Submission.jsx |
| SubmissionReview | 220+ | frontend/src/pages/admin/SubmissionReview.jsx |
| AuditLogsViewer | 240+ | frontend/src/pages/admin/AuditLogsViewer.jsx |
| Navbar | 45+ | frontend/src/components/Navbar.jsx |
| App.jsx | 75+ | frontend/src/App.jsx |

---

## Supported Audit Actions in Viewer

The AuditLogsViewer supports filtering and displaying all new audit actions:

**Document Generation Actions:**
- `PDF_GENERATED` - User generated a PDF document
- `DOCUMENT_CONVERTED` - User generated a Word document

**Submission Actions:**
- `DOCUMENT_SUBMITTED` - User submitted a draft for review
- `DOCUMENT_REVIEWED` - Admin reviewed a submission
- `DOCUMENT_APPROVED` - Admin approved a submission
- `DOCUMENT_REJECTED` - Admin rejected a submission

**OCR Actions:**
- `OCR_PROCESSED` - OCR text extraction completed

**Content Actions:**
- `CONTENT_EDITED` - User edited content

**Authentication Actions:**
- `LOGIN_SUCCESS` - Successful user login
- `LOGIN_FAILED` - Failed login attempt

---

## Error Handling

All components include comprehensive error handling:

**User-Facing Errors:**
- Form validation errors
- API request failures
- Network timeouts
- Missing required fields

**Status Messages:**
- Success messages (green) for completed actions
- Error messages (red) for failures
- Loading indicators during API calls

**Display Method:**
```javascript
{status.message ? (
  <p className={status.type === "error" ? "inline-error" : "inline-success"}>
    {status.message}
  </p>
) : null}
```

---

## Styling Conventions

All components use consistent CSS classes:

**Layout:**
- `glass-card` - Clean card background
- `stats-grid` - Stats display grid
- `grid-two-col` - Two-column layout
- `timeline-list` - Timeline/list view

**Elements:**
- `card-head` - Card header with title
- `stack-form` - Vertical form layout
- `content-preview` - Content display area

**Status:**
- `inline-error` - Error message display
- `inline-success` - Success message display
- `muted-copy` - Secondary text

---

## API Integration

All components use centralized axios instance for API calls:

**Location:** `frontend/src/api/axios.js`

**Base URL:** Configured from environment variables

**Authentication:** JWT token automatically added to headers

**CSRF Protection:** CSRF token included in request headers

---

## State Management

Components use React hooks for state management:

**Hooks Used:**
- `useState` - Local component state
- `useEffect` - Side effects (API calls)
- `useCallback` - Memoized callbacks
- `useMemo` - Memoized computations
- `useAuth` - Authentication context

**Context:** `useAuth()` provides:
- `user` - Current user object
- `logout()` - User logout function
- `user.role` - User role (ADMIN or USER)

---

## Accessibility Features

- Semantic HTML structure
- Proper label associations with form inputs
- Disabled state for buttons during loading
- Clear error and success messages
- Keyboard navigation support

---

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Required Backend APIs

For the frontend to work, following backend APIs must be available:

**Projects:**
- `GET /api/v1/projects` - List user's projects

**Submissions:**
- `GET /api/v1/submissions/{projectId}` - Get submission details
- `POST /api/v1/submissions` - Create/update draft
- `POST /api/v1/submissions/{submissionId}/submit` - Submit for review
- `POST /api/v1/submissions/{submissionId}/review` - Admin review

**Documents:**
- `POST /api/v1/documents/generate-pdf` - Generate PDF
- `POST /api/v1/documents/generate-word` - Generate Word
- `POST /api/v1/documents/generate-both` - Generate both

**OCR:**
- `POST /api/v1/ocr/extract-text` - Extract text from images

**Logs:**
- `GET /api/v1/logs/all` - Get all audit logs (admin only)
- `GET /api/v1/logs/verify-integrity` - Verify audit chain (admin only)

---

## Testing Checklist

- [ ] Content Editor: Upload image and extract text
- [ ] Content Editor: Save draft content
- [ ] Submission: Generate PDF document
- [ ] Submission: Generate Word document
- [ ] Submission: Generate both simultaneously
- [ ] Submission: Submit for review
- [ ] SubmissionReview: View pending submissions (admin)
- [ ] SubmissionReview: Approve submission (admin)
- [ ] SubmissionReview: Reject submission (admin)
- [ ] AuditLogsViewer: Filter by action type
- [ ] AuditLogsViewer: Verify integrity (admin)
- [ ] Navbar: All navigation links work
- [ ] Error messages display correctly
- [ ] Success messages display correctly
- [ ] Loading states work properly

---

## Deployment Notes

1. **Environment Variables:**
   - Ensure `REACT_APP_API_URL` is set to backend URL
   - CSRF token handling configured

2. **Build:**
   ```bash
   cd frontend
   npm run build
   ```

3. **Serve Static Files:**
   - Backend serves frontend build from public directory
   - Or use separate CDN/hosting

4. **CORS Configuration:**
   - Backend CORS must allow frontend origin
   - Credentials mode enabled in axios config

