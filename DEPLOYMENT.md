# Deployment Guide

## Vercel Frontend Deployment

### Environment Variables Required

Set these environment variables in your Vercel project settings:

```
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_production_google_client_id
```

### Package Manager

This project uses npm. The pnpm-lock.yaml file has been removed to prevent conflicts.

### Build Configuration

The project includes:

- `vercel.json` - Specifies npm as the package manager
- `.vercelignore` - Excludes backend files from deployment

### Deployment Steps

1. Connect your GitHub repository to Vercel
2. Set the environment variables in Vercel dashboard
3. Deploy - Vercel will automatically use npm install and npm run build

### Backend Deployment

The backend should be deployed separately (e.g., on Railway, Render, or AWS) and the URL should be set as `NEXT_PUBLIC_API_BASE_URL`.
