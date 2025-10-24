# Backend Deployment Configuration

## ✅ CORS Configuration Updated

The backend has been updated to properly handle the deployed frontend:

### **Allowed Origins:**

- ✅ `https://casewise-beta.vercel.app` (Production frontend)
- ✅ `http://localhost:3000` (Local development)
- ✅ `http://localhost:3001` (Alternative local port)
- ✅ `http://127.0.0.1:3000` (Local development)
- ✅ `http://127.0.0.1:3001` (Alternative local port)

### **Default Configuration:**

- ✅ Default origin changed from `localhost:3000` to `https://casewise-beta.vercel.app`
- ✅ Password reset links now point to production frontend
- ✅ Error responses use production frontend as default

## 🔧 Environment Variables for Render

Set these environment variables in your Render dashboard:

### **Required Variables:**

```
MONGODB_URL=your_mongodb_connection_string
FRONTEND_URL=https://casewise-beta.vercel.app
JWT_SECRET_KEY=your_jwt_secret_key
OPENAI_API_KEY=your_openai_api_key
```

### **Email Configuration (Optional):**

```
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

### **Google OAuth (Optional):**

```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## 🚀 Deployment Steps

1. **Update Render Environment Variables:**

   - Go to your Render dashboard
   - Navigate to your backend service
   - Go to Environment tab
   - Add/Update the variables above

2. **Redeploy Backend:**

   - Trigger a new deployment on Render
   - Monitor logs for any errors

3. **Test Integration:**
   - Visit https://casewise-beta.vercel.app
   - Check browser console for CORS errors
   - Test authentication and API calls

## 🔍 CORS Headers Included

The backend now includes all necessary CORS headers:

- ✅ `Access-Control-Allow-Origin`
- ✅ `Access-Control-Allow-Credentials`
- ✅ `Access-Control-Allow-Methods`
- ✅ `Access-Control-Allow-Headers`
- ✅ `Access-Control-Max-Age`

## 📝 Testing Checklist

- [ ] Backend deploys successfully on Render
- [ ] Frontend can connect to backend (no CORS errors)
- [ ] Google OAuth authentication works
- [ ] Document upload and processing works
- [ ] AI chat functionality works
- [ ] Concept and case-specific chats work
- [ ] Password reset emails work (if configured)

## 🐛 Troubleshooting

### If CORS errors persist:

1. Check Render logs for backend startup errors
2. Verify environment variables are set correctly
3. Ensure backend is accessible from frontend domain
4. Check browser network tab for specific error details

### If authentication fails:

1. Verify Google OAuth client ID is correct
2. Check authorized domains in Google Console
3. Ensure JWT secret key is set
4. Check backend logs for authentication errors
