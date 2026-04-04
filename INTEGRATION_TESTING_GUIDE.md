# Integration Testing Guide

## Overview

Complete testing guide for the document generation and submission workflow system.

---

## Prerequisites

**Backend:**
- Node.js 22+
- MongoDB running and connected
- Environment variables configured (.env)
- Backend running on http://localhost:8080

**Frontend:**
- React development server running on http://localhost:5173 (or 3000)
- Node.js package manager (npm)

**Test Accounts:**
- Regular user account (email: user@example.com)
- Admin account (email: admin@example.com)

---

## Startup Commands

### Backend
```bash
cd backend
npm install
npm run dev
```
Expected output: "Server running on port 8080" + "MongoDB connected"

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Expected URL: http://localhost:5173 or http://localhost:3000

---

## Test Suite 1: Content Creation (User)

### Test 1.1: Manual Content Editing
**Steps:**
1. Open http://localhost:5173
2. Login with regular user credentials
3. Navigate to "Content Editor"
4. Select a project from dropdown
5. Type content in textarea (minimum 10 characters)
6. Click "Save Draft"

**Expected Results:**
- ✅ Draft saves successfully
- ✅ Content appears in textarea
- ✅ Status message: "Draft saved successfully"
- ✅ Updated timestamp shows

**Validation:**
- Check browser console for API call: `POST /submissions`
- Verify request includes: projectId, content
- Verify response includes: submission._id, status: "DRAFT"

---

### Test 1.2: OCR Text Extraction
**Steps:**
1. In Content Editor, click "Upload Image/PDF"
2. Select a test image or PDF file
3. Wait for extraction to complete
4. Verify extracted text appears in textarea

**Expected Results:**
- ✅ File upload succeeds
- ✅ Text extraction completes (2-5 seconds)
- ✅ Extracted text appears in textarea
- ✅ Status: "OCR extraction completed"

**Validation:**
- Check browser console for API call: `POST /ocr/extract-text`
- Verify response includes: extractedText, pages array
- Check backend logs for OCR_PROCESSED audit action

---

### Test 1.3: Draft Persistence
**Steps:**
1. In Content Editor, save draft with content
2. Refresh browser (F5)
3. Navigate back to Content Editor same project
4. Verify draft content is loaded

**Expected Results:**
- ✅ Draft content loads automatically
- ✅ Content matches what was saved
- ✅ No data loss on refresh

**Validation:**
- Check browser Network tab: `GET /submissions/{projectId}` called on page load
- Verify response includes saved content

---

---

## Test Suite 2: Document Generation (User)

### Test 2.1: Generate PDF Document
**Steps:**
1. Navigate to "Submission" page
2. Select a project with existing content
3. Verify content displays in "Current Content" section
4. Click "Generate PDF" button
5. Wait for success message

**Expected Results:**
- ✅ Loading indicator appears
- ✅ Success message: "PDF generated successfully"
- ✅ PDF file appears in "Generated Documents" section
- ✅ Download link is clickable

**Validation:**
- Check browser Network tab: `POST /documents/generate-pdf`
- Verify request includes: content, projectId
- Verify response includes: fileUrlPDF path
- Check backend /documents directory: PDF file exists
- Download PDF and verify: opens correctly, contains content, has proper formatting

---

### Test 2.2: Generate Word Document
**Steps:**
1. In Submission page, click "Generate Word" button
2. Wait for success message
3. Verify Word document appears

**Expected Results:**
- ✅ Loading indicator appears
- ✅ Success message: "Word document generated successfully"
- ✅ Word file appears in "Generated Documents" section
- ✅ Download link is clickable

**Validation:**
- Check browser Network tab: `POST /documents/generate-word`
- Verify request includes: content, projectId
- Verify response includes: fileUrlWord path
- Download .docx and verify: opens in Word/LibreOffice, contains content

---

### Test 2.3: Generate Both Simultaneously
**Steps:**
1. In Submission page, click "Generate Both" button
2. Wait for completion (should be faster than generating separately)
3. Verify both PDF and Word appear

**Expected Results:**
- ✅ Single loading indicator for both
- ✅ Success message: "Both documents generated successfully"
- ✅ Both PDF and Word files appear
- ✅ Generation faster than sequential (tests parallel Promise.all)

**Validation:**
- Network tab shows: First `POST /documents/generate-both` request
- Single response contains: both fileUrlPDF and fileUrlWord
- Two files exist in backend /documents directory

---

### Test 2.4: Document Download Links
**Steps:**
1. In Submission page, click "Download PDF"
2. Verify PDF downloads to Downloads folder
3. Click "Download Word"
4. Verify Word downloads to Downloads folder
5. Open both files on local system

**Expected Results:**
- ✅ PDF downloads successfully
- ✅ Word downloads successfully
- ✅ Files have correct names (pdf_xxx.pdf, word_xxx.docx)
- ✅ Both files open correctly

**Validation:**
- Files exist in Downloads folder
- PDF opens with correct formatting (headers, footers, page numbers)
- Word opens with proper styling

---

### Test 2.5: Tamil Unicode Support
**Steps:**
1. In Content Editor, paste Tamil content:
   ```
   உதாரணட்று உள்ளடக்க பரிசோதனை
   இது ஒரு தமிழ் மொழி பரிசோதனை
   ```
2. Save draft
3. Navigate to Submission page
4. Generate PDF and Word documents
5. Download both and verify Tamil text renders correctly

**Expected Results:**
- ✅ Tamil text displays correctly in submission
- ✅ PDF contains readable Tamil characters
- ✅ Word contains readable Tamil characters
- ✅ No corrupted/garbled characters

**Validation:**
- Open PDF in Adobe Reader: Tamil text renders correctly
- Open Word in Microsoft Word: Tamil text renders correctly
- Check PDF hex: UTF-8 encoding present

---

---

## Test Suite 3: Submission Workflow (User)

### Test 3.1: Submit Without Content
**Steps:**
1. Navigate to Submission page
2. Select project with EMPTY draft
3. Click "Submit for Review" button
4. Observe error handling

**Expected Results:**
- ✅ Error message displays: "Cannot submit without content or generated files"
- ✅ Submit button disabled (if no content)
- ✅ Status remains "DRAFT"

**Validation:**
- API call doesn't go through, or returns 400 error
- Backend logs show validation error

---

### Test 3.2: Submit With Content Only
**Steps:**
1. Navigate to Submission page
2. Select project with text content (but no generated files)
3. Click "Submit for Review"
4. Observe successful submission

**Expected Results:**
- ✅ Success message: "Submission submitted successfully"
- ✅ Status changes to "SUBMITTED"
- ✅ Submit button becomes disabled
- ✅ New status displays: "SUBMITTED"

**Validation:**
- Network tab: `POST /submissions/{id}/submit` succeeds (200)
- Response includes: submission.status === "SUBMITTED"
- Backend audit logs show: DOCUMENT_SUBMITTED action
- Check metadata includes: hasContent: true

---

### Test 3.3: Submit With Generated Documents
**Steps:**
1. Navigate to Submission page
2. Generate both PDF and Word documents
3. Click "Submit for Review"
4. Verify successful submission

**Expected Results:**
- ✅ Success message displays
- ✅ Status changes to "SUBMITTED"
- ✅ All three indicators show: content ✓, PDF ✓, Word ✓

**Validation:**
- Network tab: `POST /submissions/{id}/submit` succeeds
- Audit log metadata shows: hasContent: true, hasPDF: true, hasWord: true

---

### Test 3.4: Ownership Validation
**Steps:**
1. As user A, create and submit a document
2. Logout and login as user B
3. Try to access user A's submission (if possible)
4. Verify authorization error

**Expected Results:**
- ✅ Error: "Access denied" or document not visible
- ✅ Cannot modify another user's submission

**Validation:**
- If attempting API call directly: 403 Forbidden
- Frontend shows: Submission not found or access denied

---

---

## Test Suite 4: Admin Review (Admin)

### Test 4.1: View Pending Submissions
**Steps:**
1. Login as admin account
2. Navigate to "Review Submissions"
3. Observe list of pending submissions

**Expected Results:**
- ✅ Only SUBMITTED submissions appear
- ✅ List shows: user name, project, submission date
- ✅ Each submission is clickable

**Validation:**
- Network tab: `GET /submissions` succeeds
- Only submissions with status === "SUBMITTED" appear
- Count matches actual submitted documents

---

### Test 4.2: Select and View Submission Details
**Steps:**
1. In Review Submissions, click on a pending submission
2. Observe details panel loads
3. Verify all information displays

**Expected Results:**
- ✅ User details display
- ✅ Project name displays
- ✅ Content preview shows
- ✅ Document links appear (if documents exist)
- ✅ Submission timestamp shows

**Validation:**
- Right panel populates with submission data
- Content preview is readable
- Document links point to correct files

---

### Test 4.3: Download Documents (Admin)
**Steps:**
1. In submission detail, click "Download PDF"
2. Verify PDF downloads
3. Click "Download Word"
4. Verify Word downloads

**Expected Results:**
- ✅ PDF downloads successfully
- ✅ Word downloads successfully
- ✅ Files open and are readable

**Validation:**
- Files download to Downloads folder
- Files have correct content

---

### Test 4.4: Approve Submission
**Steps:**
1. In submission detail, enter optional feedback
2. Click "Approve" button
3. Verify success and status change

**Expected Results:**
- ✅ Loading indicator appears
- ✅ Success message: "Submission approved successfully"
- ✅ Submission disappears from list (status changed to APPROVED)
- ✅ Feedback saved (if entered)

**Validation:**
- Network tab: `POST /submissions/{id}/review` sent with status=APPROVED
- Response shows: submission.status === "APPROVED"
- Audit logs created:
  - DOCUMENT_REVIEWED
  - DOCUMENT_APPROVED
- Submission no longer appears in SUBMITTED list

---

### Test 4.5: Reject Submission
**Steps:**
1. In submission detail, enter feedback explaining why
2. Click "Reject" button
3. Verify success and status change

**Expected Results:**
- ✅ Loading indicator appears
- ✅ Success message: "Submission rejected successfully"
- ✅ Submission disappears from list (status changed to REJECTED)
- ✅ Feedback is saved

**Validation:**
- Network tab: `POST /submissions/{id}/review` sent with status=REJECTED
- Response shows: submission.status === "REJECTED"
- Audit logs created:
  - DOCUMENT_REVIEWED
  - DOCUMENT_REJECTED
- Feedback persists in database

---

### Test 4.6: Feedback Character Limit
**Steps:**
1. In submission detail, click in feedback textarea
2. Try to paste/type more than 5000 characters
3. Observe limit enforcement

**Expected Results:**
- ✅ Textarea enforces 5000 character limit
- ✅ Cannot type/paste beyond limit
- ✅ Character count shows remaining space (optional UI)

**Validation:**
- Frontend prevents more than 5000 chars
- Backend validation also enforces limit

---

---

## Test Suite 5: Audit Logging

### Test 5.1: Audit Log Creation
**Steps:**
1. Complete workflow: Create content → Generate PDF → Generate Word → Submit → Approve
2. Navigate to "Audit Logs" (admin)
3. Observe all actions logged

**Expected Results:**
- ✅ PDF_GENERATED appears
- ✅ DOCUMENT_CONVERTED appears
- ✅ DOCUMENT_SUBMITTED appears
- ✅ DOCUMENT_REVIEWED appears
- ✅ DOCUMENT_APPROVED appears

**Validation:**
- All audit logs show correct action names
- Timestamps are accurate
- User emails match who performed action
- Sequence numbers increment properly

---

### Test 5.2: Audit Log Filtering
**Steps:**
1. In Audit Logs, use action filter dropdown
2. Select "PDF_GENERATED"
3. Verify only PDF_GENERATED logs appear
4. Try other filters

**Expected Results:**
- ✅ Dropdown lists all available actions
- ✅ Filter works: only selected action appears
- ✅ Count updates correctly
- ✅ Pagination updates

**Validation:**
- All displayed logs match selected action
- List can be filtered by any of 7+ new actions

---

### Test 5.3: Audit Log Pagination
**Steps:**
1. In Audit Logs, observe pagination controls
2. Click "Next Page"
3. Verify new logs appear
4. Click "Previous Page"
5. Verify original logs reappear

**Expected Results:**
- ✅ Pagination controls visible
- ✅ Next button works
- ✅ Previous button works
- ✅ Page number updates
- ✅ Correct logs appear on each page

**Validation:**
- Page parameter changes in API call
- Logs match page parameter
- 20 logs per page (default)

---

### Test 5.4: Integrity Verification
**Steps:**
1. In Audit Logs, click "Verify Integrity" button
2. Wait for verification to complete
3. Observe verification status

**Expected Results:**
- ✅ Loading indicator appears
- ✅ Verification completes (2-5 seconds)
- ✅ Status shows: "✓ VALID" or "✗ INVALID"
- ✅ Message displays verification result

**Validation:**
- Network tab: `GET /logs/verify-integrity` called
- Response shows: status: "VALID"
- All checkpoints verified
- Hash chain unbroken

---

### Test 5.5: Hash Chain Integrity
**Steps:**
1. Click "Verify Integrity"
2. Observe hash values displayed
3. Verify each log has unique hash
4. Confirm sequence numbers are consecutive

**Expected Results:**
- ✅ Each log shows hash preview (first 16 chars)
- ✅ Hash values differ for each log
- ✅ Sequence numbers: 1, 2, 3, ... N
- ✅ No gaps in sequence

**Validation:**
- Hash column shows 16-char hex strings
- Hashes are deterministic (same action generates same hash for same input)
- Sequence is unbroken

---

---

## Test Suite 6: Authorization & Security

### Test 6.1: User Cannot Review
**Steps:**
1. Login as regular user
2. Try to access /dashboard/submission-review (directly in URL)
3. Observe access denied

**Expected Results:**
- ✅ Redirected to dashboard
- ✅ Cannot access admin pages
- ✅ Review Submissions link not in navbar

**Validation:**
- 403 Forbidden if attempting API directly
- Frontend protects with AdminRoute component

---

### Test 6.2: User Cannot View Audit Logs
**Steps:**
1. Login as regular user
2. Try to access /dashboard/audit-logs (directly)
3. Observe access denied

**Expected Results:**
- ✅ Redirected or hidden
- ✅ Audit Logs link not in navbar
- ✅ Cannot access audit data

**Validation:**
- Frontend protects route
- API returns 403 if user tries directly

---

### Test 6.3: Submission Ownership Validation
**Steps:**
1. As user A, note submission ID
2. Logout and login as user B
3. Try to submit user A's draft (if possible to craft API call)
4. Observe ownership validation

**Expected Results:**
- ✅ Error: Cannot submit another user's submission
- ✅ 403 Forbidden or 404 Not Found

**Validation:**
- Backend checks: submission.userId === req.user.id

---

### Test 6.4: CSRF Protection
**Steps:**
1. Open browser DevTools
2. Login normally
3. Check cookies: CSRF token present
4. Try posting without CSRF token (if possible)

**Expected Results:**
- ✅ CSRF token set in cookies
- ✅ Requests include CSRF token
- ✅ Requests without token fail

**Validation:**
- Cookie shows CSRF token
- Axios config includes token in headers

---

---

## Test Suite 7: Error Handling

### Test 7.1: Network Errors
**Steps:**
1. Stop backend server
2. Try to generate document or submit
3. Observe error handling

**Expected Results:**
- ✅ Error message displays
- ✅ No crashes or blank pages
- ✅ User can refresh and retry

**Validation:**
- Console shows error but doesn't crash
- Error message is user-friendly
- No unhandled promise rejections

---

### Test 7.2: Invalid Input
**Steps:**
1. Try to submit without selecting project
2. Try to generate document with invalid ObjectId
3. Try to submit with only whitespace

**Expected Results:**
- ✅ Validation errors display
- ✅ API call is prevented (frontend)
- ✅ If call goes through, backend rejects it

**Validation:**
- Zod validation catches errors
- 400 Bad Request response

---

### Test 7.3: Database Errors
**Steps:**
1. Simulate database error (if possible)
2. Try to perform action
3. Observe error response

**Expected Results:**
- ✅ User sees: "An error occurred. Please try again later."
- ✅ No database connection strings in error message
- ✅ Error logged on backend

**Validation:**
- 500 Internal Server Error response
- Error doesn't expose sensitive info

---

---

## Test Suite 8: Performance

### Test 8.1: Document Generation Speed
**Steps:**
1. Generate PDF (note time)
2. Generate Word (note time)
3. Generate Both (note time)

**Expected Results:**
- ✅ PDF: < 2 seconds
- ✅ Word: < 2 seconds
- ✅ Both: < 3 seconds (faster than 4 seconds separate)

**Validation:**
- Network tab shows request/response times
- Parallel generation is faster than sequential

---

### Test 8.2: Large Content Handling
**Steps:**
1. Create content near 40,000 character limit
2. Generate PDF/Word
3. Submit

**Expected Results:**
- ✅ Large content handled correctly
- ✅ No timeouts or crashes
- ✅ Documents generate successfully

**Validation:**
- No file size errors
- Documents complete in reasonable time

---

### Test 8.3: Pagination Performance
**Steps:**
1. In Audit Logs, navigate through pages with 200+ logs
2. Observe responsiveness

**Expected Results:**
- ✅ Pages load quickly (< 1 second)
- ✅ No lag or stuttering
- ✅ List responsive

**Validation:**
- Network requests are fast
- Frontend renders smoothly

---

---

## Regression Testing Checklist

After any backend/frontend changes:

- [ ] Create and save draft
- [ ] Generate PDF document
- [ ] Generate Word document  
- [ ] Submit for review
- [ ] Admin can review
- [ ] Admin can approve
- [ ] Admin can reject
- [ ] Audit logs created correctly
- [ ] Integrity verification passes
- [ ] User cannot access admin pages
- [ ] Admin authorization enforced
- [ ] Error messages display correctly
- [ ] File downloads work
- [ ] Turkish/Tamil unicode preserved
- [ ] No JavaScript errors in console

---

## Troubleshooting

### Backend Issues

**MongoDB Connection Fails:**
```bash
# Check MongoDB status
mongod --version
# Ensure MongoDB is running
```

**Port 8080 Already in Use:**
```bash
# Find process on port 8080
netstat -ano | findstr :8080
# Kill process
taskkill /PID <PID> /F
```

**Module Not Found Errors:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Frontend Issues

**Module Not Found:**
```bash
cd frontend
npm install
```

**Port 5173/3000 Already in Use:**
```bash
# Kill process on port 5173
# macOS: lsof -ti:5173 | xargs kill -9
# Windows: netstat -ano | findstr :5173
```

**CORS Errors:**
- Ensure backend CORS headers allow frontend origin
- Check backend .env ALLOWED_ORIGINS

**Document Downloads Not Working:**
- Check /documents directory exists in backend
- Verify static file serving configured
- Check browser console for blocked downloads

---

## Test Report Template

```
Date: YYYY-MM-DD
Tester: Name
Environment: Local/Staging/Production

PASSED TESTS:
- Test 1.1: ✅
- Test 2.1: ✅
- ... (list all passed)

FAILED TESTS:
- Test X.X: ❌ Description of failure
- ... (list failures with details)

NOTES:
- Any observations or issues

OVERALL: PASS / FAIL
```

---

## Continuous Integration

For automated testing:

**Backend Tests:**
```bash
cd backend
npm test
```

**Frontend Tests:**
```bash
cd frontend
npm test
```

**Linting:**
```bash
# Backend
npm run lint

# Frontend  
npm run lint
```

