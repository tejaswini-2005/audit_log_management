# Quick Start Guide

## 5-Minute Setup

### 1. Start Backend
```bash
cd backend
npm install
npm run dev
```

**Expected Output:**
```
✅ MongoDB connected
✅ Server running on port 8080
✅ CORS enabled for http://localhost:5173
```

### 2. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

**Expected Output:**
```
✅ VITE v5.x.x ready in XXX ms
✅ Local: http://localhost:5173
```

### 3. Open Browser
```
http://localhost:5173
```

---

## Basic Features Overview

### For Regular Users

**Feature 1: Create Content**
- Navigate to "Content Editor"
- Select a project
- Upload image/PDF for OCR OR type content manually
- Click "Save Draft"

**Feature 2: Generate Documents**
- Navigate to "Submission"
- Select project with draft content
- Click "Generate PDF" or "Generate Word" or "Generate Both"
- Download generated documents to review

**Feature 3: Submit for Review**
- In Submission page
- Click "Submit for Review"
- Status changes from DRAFT to SUBMITTED

---

### For Admins

**Feature 1: Review Submissions**
- Navigate to "Review Submissions"
- View list of submitted documents
- Click to select one
- View content and documents
- Add feedback (optional)
- Click "Approve" or "Reject"

**Feature 2: View Audit Logs**
- Navigate to "Audit Logs"
- Filter by action (PDF_GENERATED, DOCUMENT_SUBMITTED, etc.)
- Click "Verify Integrity" to check hash chain
- Verify no logs have been tampered with

---

## API Endpoints Quick Reference

### Document Generation
```bash
# Generate PDF
POST /api/v1/documents/generate-pdf
Body: { content: "...", projectId: "..." }

# Generate Word
POST /api/v1/documents/generate-word
Body: { content: "...", projectId: "..." }

# Generate Both
POST /api/v1/documents/generate-both
Body: { content: "...", projectId: "..." }
```

### Submission
```bash
# Submit for review
POST /api/v1/submissions/{submissionId}/submit
Body: {}

# Admin review
POST /api/v1/submissions/{submissionId}/review
Body: { status: "APPROVED" | "REJECTED", feedback: "..." }
```

### Audit
```bash
# Get audit logs (admin only)
GET /api/v1/logs/all?action=PDF_GENERATED&page=1

# Verify integrity (admin only)
GET /api/v1/logs/verify-integrity
```

---

## File Locations

### Backend Key Files
- **Document Generation:** `backend/Utils/documentGenerator.js`
- **Document API:** `backend/controllers/documentController.js`
- **Submission API:** `backend/controllers/submissionController.js`
- **Routes:** `backend/routes/documentRoutes.js`, `backend/routes/submissionRoutes.js`
- **Validation:** `backend/validators/documentSchemas.js`
- **Models:** `backend/models/Submission.js`

### Frontend Key Files
- **User Submission Page:** `frontend/src/pages/user/Submission.jsx`
- **Admin Review Page:** `frontend/src/pages/admin/SubmissionReview.jsx`
- **Audit Logs Viewer:** `frontend/src/pages/admin/AuditLogsViewer.jsx`
- **Navigation:** `frontend/src/components/Navbar.jsx`
- **Routes:** `frontend/src/App.jsx`

### Generated Files
- **Documents:** `backend/documents/` (auto-created)
  - PDF files: `pdf_TIMESTAMP_RANDOM.pdf`
  - Word files: `word_TIMESTAMP_RANDOM.docx`

---

## Test User Accounts

Use these for testing (must exist in MongoDB):

**Regular User:**
- Email: user@example.com
- Password: password123
- Role: USER

**Admin User:**
- Email: admin@example.com
- Password: password123
- Role: ADMIN

---

## Common Tasks

### Task 1: Generate and Submit a Document

```
1. Open http://localhost:5173
2. Login as user@example.com
3. Go to Content Editor
4. Select a project
5. Type or paste content
6. Click "Save Draft"
7. Go to Submission
8. Click "Generate Both" (generates PDF and Word)
9. Click "Submit for Review"
10. Check console: DOCUMENT_SUBMITTED audit log created
```

### Task 2: Review and Approve as Admin

```
1. Logout and login as admin@example.com
2. Go to Review Submissions
3. Click on a pending submission
4. Review the content and documents
5. Add optional feedback
6. Click "Approve"
7. Check console: Three audit logs created
   - DOCUMENT_REVIEWED
   - DOCUMENT_APPROVED
8. Submission disappears from list
```

### Task 3: Verify Audit Integrity

```
1. As admin, go to Audit Logs
2. Use filter to find: PDF_GENERATED, DOCUMENT_SUBMITTED, DOCUMENT_APPROVED
3. Click "Verify Integrity"
4. Observe result: ✓ VALID (hash chain unbroken)
5. All 21 audit actions supported
```

---

## Troubleshooting

### Error: MongoDB Connection Failed
```
❌ Error: MongooseError: Cannot connect
✅ Solution: 
   - Start MongoDB: mongod
   - OR check .env MONGO_URI
   - OR ensure MongoDB is running
```

### Error: Port 8080 Already in Use
```bash
# Kill the process using port 8080
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### Error: CORS Error
```
❌ Error: CORS policy...
✅ Solution:
   - Ensure backend CORS is configured
   - Frontend should be running on http://localhost:5173
   - Check .env ALLOWED_ORIGINS
```

### Error: Document Not Generating
```
❌ Error: Cannot generate document
✅ Solutions:
   1. Check /documents directory exists: backend/documents/
   2. Check content length < 40,000 characters
   3. Check pdfkit and docx packages installed: npm list
   4. Check file permissions on /documents folder
```

### Error: Login Failed
```
❌ Error: Invalid credentials
✅ Solutions:
   1. Verify user exists in MongoDB
   2. Check correct password
   3. Check user has role field (USER or ADMIN)
   4. Check database connection
```

---

## Testing Checklist

Quick test to verify all features work:

- [ ] Backend starts without errors
- [ ] Frontend loads http://localhost:5173
- [ ] Login works with user account
- [ ] Create draft content in Content Editor
- [ ] Save draft successfully
- [ ] Navigate to Submission page
- [ ] Generate PDF document
- [ ] Generate Word document
- [ ] Submit for review (status changes to SUBMITTED)
- [ ] Logout and login as admin
- [ ] View pending submissions
- [ ] Approve a submission
- [ ] Check Audit Logs
- [ ] Filter by PDF_GENERATED
- [ ] Verify Integrity (should show ✓ VALID)
- [ ] All features working ✅

---

## Environment Variables

### Backend (.env)
```
MONGO_URI=mongodb://localhost:27017/audit_portal
JWT_SECRET=your_secret_key_here
NODE_PORT=8080
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8080/api/v1
VITE_APP_NAME=Audit Portal
```

---

## Key Features at a Glance

| Feature | User | Admin | Status |
|---------|------|-------|--------|
| Create content | ✅ | ✅ | Complete |
| OCR extraction | ✅ | ✅ | Complete |
| Generate PDF | ✅ | View | Complete |
| Generate Word | ✅ | View | Complete |
| Submit documents | ✅ | - | Complete |
| Review submissions | - | ✅ | Complete |
| Approve/Reject | - | ✅ | Complete |
| View audit logs | - | ✅ | Complete |
| Verify integrity | - | ✅ | Complete |
| Tamil Unicode | ✅ | ✅ | Complete |

---

## System Status

**Current Version:** 1.0.0

**Features Implemented:** ✅ All

**Status:** 🟢 Production Ready

**Last Updated:** 2024-01-15

---

## Documentation Quick Links

1. **[System Architecture](./SYSTEM_ARCHITECTURE.md)** - Complete system design
2. **[Frontend Implementation](./FRONTEND_IMPLEMENTATION.md)** - React components details
3. **[Backend API Documentation](./BACKEND_API_DOCUMENTATION.md)** - All API endpoints
4. **[Integration Testing Guide](./INTEGRATION_TESTING_GUIDE.md)** - Complete testing procedures

---

## Next Steps

### Option 1: Start Integrated Testing
Follow [Integration Testing Guide](./INTEGRATION_TESTING_GUIDE.md) for complete test procedures.

### Option 2: Deploy to Production
- Build frontend: `npm run build`
- Configure environment variables
- Set up HTTPS/TLS
- Deploy to server
- Configure MongoDB backups

### Option 3: Extend Functionality
- Add more audit actions
- Implement batch operations
- Add email notifications
- Create dashboard analytics
- Add advanced search

---

## Support

For detailed information:
- Backend APIs: See [Backend API Documentation](./BACKEND_API_DOCUMENTATION.md)
- Frontend components: See [Frontend Implementation](./FRONTEND_IMPLEMENTATION.md)
- Testing procedures: See [Integration Testing Guide](./INTEGRATION_TESTING_GUIDE.md)
- System design: See [System Architecture](./SYSTEM_ARCHITECTURE.md)

---

**Ready to start? Run the startup commands above and open http://localhost:5173 in your browser!** 🚀

