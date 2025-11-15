# Quick Deployment Checklist

## ✅ Frontend (Vercel) - Already Configured!

The frontend is now configured to automatically use environment variables:
- ✅ `lib/config.ts` updated to use `NEXT_PUBLIC_API_BASE_URL`
- ✅ Falls back to `localhost:8000` for local development

### Action Required:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `NEXT_PUBLIC_API_BASE_URL` = `https://casewise-backend.onrender.com`
3. Add: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = `your_production_google_client_id`
4. Redeploy frontend

## ✅ Backend (Render/Railway) - Ready to Deploy!

### Files Created:
- ✅ `Casewise-backend/render.yaml` - Render deployment config
- ✅ `Casewise-backend/Dockerfile` - Docker deployment config
- ✅ Backend updated to use `PORT` environment variable

### Action Required:

#### For Render.com:
1. Create new Web Service in Render
2. Connect GitHub repository
3. Render will auto-detect `render.yaml` config
4. Set environment variables in Render dashboard:
   - `MONGODB_URL`
   - `SECRET_KEY`
   - `OPENAI_API_KEY`
   - `GOOGLE_CLIENT_ID`
   - `FRONTEND_URL=https://casewise-beta.vercel.app`
   - `PORT=10000`

#### For Railway:
1. Create new project
2. Deploy from GitHub
3. Set environment variables (same as above)
4. Railway auto-detects Python and deploys

## 🔗 Connection Status

### Backend CORS Configuration:
✅ Already configured to allow:
- `https://casewise-beta.vercel.app` (Production)
- `http://localhost:3000` (Local dev)

### Frontend API Configuration:
✅ Now uses environment variable:
- Production: `NEXT_PUBLIC_API_BASE_URL` from Vercel
- Local: Falls back to `http://localhost:8000`

## 🧪 Test After Deployment

1. **Backend Health Check:**
   ```bash
   curl https://your-backend-url.com/health
   ```

2. **Frontend Connection:**
   - Visit https://casewise-beta.vercel.app
   - Open browser console
   - Check for API connection logs
   - Verify no CORS errors

3. **Test Authentication:**
   - Try Google OAuth login
   - Verify API calls work

## 📝 Summary

**What's Done:**
- ✅ Frontend config updated to use env vars
- ✅ Backend CORS configured for production
- ✅ Backend supports PORT env variable
- ✅ Deployment configs created (Render.yaml, Dockerfile)

**What You Need to Do:**
1. Set environment variables in Vercel
2. Deploy backend to Render/Railway
3. Set environment variables in backend platform
4. Test the connection

See `DEPLOYMENT_SETUP.md` for detailed instructions.

