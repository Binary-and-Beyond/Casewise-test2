# Integration Checklist

## ✅ Frontend-Backend Integration Steps

### 1. Environment Variables Setup

**In Vercel Dashboard:**

- [ ] Go to Project Settings → Environment Variables
- [ ] Add `NEXT_PUBLIC_API_BASE_URL` = `https://casewise-backend.onrender.com`
- [ ] Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = Your Google OAuth Client ID
- [ ] Redeploy the frontend after adding variables

### 2. Backend CORS Verification

**Test Backend CORS:**

- [ ] Visit: https://casewise-backend.onrender.com/health
- [ ] Should return: `{"status": "healthy", "message": "Backend is running", "cors": "enabled"}`
- [ ] Check browser Network tab for CORS headers

### 3. Frontend-Backend Connection Test

**Test on Frontend:**

1. [ ] Visit: https://casewise-beta.vercel.app
2. [ ] Open browser console (F12)
3. [ ] Run: `testIntegration()` (if test script is loaded)
4. [ ] Check for any CORS or connection errors

### 4. Authentication Flow Test

**Google OAuth Setup:**

- [ ] Ensure Google OAuth Client ID is configured for:
  - Authorized JavaScript origins: `https://casewise-beta.vercel.app`
  - Authorized redirect URIs: `https://casewise-beta.vercel.app`
- [ ] Test login flow on the deployed frontend

### 5. Core Functionality Tests

**Document Upload & Processing:**

- [ ] Upload a medical document
- [ ] Verify document is processed by backend
- [ ] Check for any API errors in console

**Chat Functionality:**

- [ ] Test main chat functionality
- [ ] Test concept-specific chats (should be unique per concept)
- [ ] Test case-specific chats (should be unique per case)

**MCQ Generation:**

- [ ] Generate MCQs for a case
- [ ] Verify questions are created and displayed

**Concept Identification:**

- [ ] Identify concepts from a document
- [ ] Click on individual concepts
- [ ] Verify each concept has its own chat

### 6. Error Monitoring

**Check for Common Issues:**

- [ ] No CORS errors in browser console
- [ ] No 404 errors for API endpoints
- [ ] No authentication errors
- [ ] No network timeouts

### 7. Performance Verification

**Load Testing:**

- [ ] Frontend loads quickly
- [ ] Backend responds within reasonable time
- [ ] No memory leaks or excessive API calls

## Troubleshooting

### If CORS Errors Occur:

1. Check backend CORS configuration
2. Verify frontend domain is allowed
3. Check if credentials are properly set

### If Authentication Fails:

1. Verify Google OAuth Client ID
2. Check authorized domains in Google Console
3. Ensure environment variables are set correctly

### If API Calls Fail:

1. Check `NEXT_PUBLIC_API_BASE_URL` is correct
2. Verify backend is running and accessible
3. Check network tab for specific error codes

## Success Criteria

✅ **Integration is successful when:**

- Frontend loads without errors
- User can authenticate with Google
- Documents can be uploaded and processed
- AI chat works for main, concept, and case contexts
- Each concept/case maintains unique chat history
- All API calls return successful responses
