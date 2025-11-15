# Deployment Setup Guide

This guide will help you connect both the frontend and backend to their respective deployment platforms.

## 🚀 Deployment URLs

- **Frontend**: https://casewise-beta.vercel.app
- **Backend**: https://casewise-backend.onrender.com (or your Render/Railway URL)

## 📋 Frontend Deployment (Vercel)

### Step 1: Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```
NEXT_PUBLIC_API_BASE_URL=https://casewise-backend.onrender.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_production_google_client_id
```

### Step 2: Redeploy Frontend

After setting environment variables:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or push a new commit to trigger automatic deployment

### Step 3: Verify Frontend Configuration

The frontend is now configured to use environment variables:
- In production: Uses `NEXT_PUBLIC_API_BASE_URL` from Vercel environment variables
- In local development: Falls back to `http://localhost:8000`

## 🔧 Backend Deployment (Render/Railway)

### Option A: Render.com Deployment

1. **Create a new Web Service** in Render
2. **Connect your repository** (GitHub/GitLab)
3. **Configure the service:**
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3

4. **Set Environment Variables** in Render dashboard:
   ```
   MONGODB_URL=your_mongodb_connection_string
   DATABASE_NAME=casewise
   SECRET_KEY=your_secret_key_here
   OPENAI_API_KEY=your_openai_api_key
   GOOGLE_CLIENT_ID=your_google_client_id
   FRONTEND_URL=https://casewise-beta.vercel.app
   PORT=10000
   ```

5. **Deploy**: Render will automatically deploy when you push to your repository

### Option B: Railway Deployment

1. **Create a new project** in Railway
2. **Deploy from GitHub** repository
3. **Set Environment Variables:**
   ```
   MONGODB_URL=your_mongodb_connection_string
   DATABASE_NAME=casewise
   SECRET_KEY=your_secret_key_here
   OPENAI_API_KEY=your_openai_api_key
   GOOGLE_CLIENT_ID=your_google_client_id
   FRONTEND_URL=https://casewise-beta.vercel.app
   ```

4. Railway will automatically detect the Python app and deploy

### Option C: Docker Deployment

If using Docker (e.g., on Railway, Fly.io, or any Docker host):

1. The `Dockerfile` is already created in `Casewise-backend/`
2. Build and deploy using:
   ```bash
   docker build -t casewise-backend ./Casewise-backend
   docker run -p 8000:8000 --env-file .env casewise-backend
   ```

## ✅ Verification Checklist

### Backend Verification

1. **Test Health Endpoint:**
   ```bash
   curl https://casewise-backend.onrender.com/health
   ```

2. **Test Root Endpoint:**
   ```bash
   curl https://casewise-backend.onrender.com/
   ```

3. **Check CORS Configuration:**
   - Backend should allow: `https://casewise-beta.vercel.app`
   - Verify in browser console that CORS errors are resolved

### Frontend Verification

1. **Visit**: https://casewise-beta.vercel.app
2. **Open Browser Console** (F12)
3. **Check for:**
   - ✅ API connection logs showing the correct backend URL
   - ✅ No CORS errors
   - ✅ Authentication working
   - ✅ API calls succeeding

## 🔍 Troubleshooting

### CORS Errors

**Problem**: Frontend can't connect to backend due to CORS policy

**Solution**:
1. Verify backend CORS includes your frontend URL
2. Check backend logs for CORS-related messages
3. Ensure `FRONTEND_URL` environment variable is set correctly in backend

### Environment Variables Not Working

**Problem**: Frontend still using localhost URL

**Solution**:
1. Ensure variables are set in Vercel dashboard (not just `.env.local`)
2. Variables must start with `NEXT_PUBLIC_` to be accessible in browser
3. Redeploy frontend after setting variables

### Backend Not Starting

**Problem**: Backend service fails to start

**Solution**:
1. Check backend logs for errors
2. Verify all environment variables are set
3. Ensure MongoDB connection string is correct
4. Check that `PORT` environment variable is set (Render uses `$PORT`)

### Database Connection Issues

**Problem**: Backend can't connect to MongoDB

**Solution**:
1. Verify `MONGODB_URL` is correct
2. Check MongoDB Atlas IP whitelist (if using Atlas)
3. Ensure database user has proper permissions

## 📝 Environment Variables Reference

### Frontend (.env.local for local development)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### Backend (.env for local development)

```env
MONGODB_URL=mongodb://localhost:27017/casewise
DATABASE_NAME=casewise
SECRET_KEY=your_secret_key
OPENAI_API_KEY=your_openai_key
GOOGLE_CLIENT_ID=your_google_client_id
FRONTEND_URL=http://localhost:3000
```

## 🎯 Quick Start Commands

### Local Development

**Backend:**
```bash
cd Casewise-backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```bash
npm install
npm run dev
```

### Production Deployment

1. **Backend**: Push to GitHub → Render/Railway auto-deploys
2. **Frontend**: Push to GitHub → Vercel auto-deploys
3. **Set environment variables** in both platforms
4. **Verify** both services are running

## 🔐 Security Notes

- Never commit `.env` files to git
- Use strong `SECRET_KEY` values
- Keep API keys secure and rotate them regularly
- Use environment variables for all sensitive data
- Enable HTTPS for all production deployments

