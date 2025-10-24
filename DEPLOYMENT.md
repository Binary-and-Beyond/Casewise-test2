# Deployment Guide

## ✅ DEPLOYED APPLICATIONS

- **Frontend**: [https://casewise-beta.vercel.app](https://casewise-beta.vercel.app)
- **Backend**: [https://casewise-backend.onrender.com](https://casewise-backend.onrender.com)

## Environment Variables Required

Set these environment variables in your Vercel project settings:

```
NEXT_PUBLIC_API_BASE_URL=https://casewise-backend.onrender.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_production_google_client_id
```

## Integration Steps

### 1. Update Vercel Environment Variables

In your Vercel dashboard:

1. Go to your project settings
2. Navigate to Environment Variables
3. Add/Update:
   - `NEXT_PUBLIC_API_BASE_URL` = `https://casewise-backend.onrender.com`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = Your Google OAuth client ID

### 2. Backend CORS Configuration

Ensure your backend at `https://casewise-backend.onrender.com` has CORS configured to allow:

- Origin: `https://casewise-beta.vercel.app`
- Credentials: `true`

### 3. Redeploy Frontend

After setting environment variables:

1. Trigger a new deployment in Vercel
2. The frontend will now connect to your deployed backend

## Package Manager

This project uses npm. The pnpm-lock.yaml file has been removed to prevent conflicts.

## Build Configuration

The project includes:

- `vercel.json` - Specifies npm as the package manager
- `.vercelignore` - Excludes backend files from deployment

## Testing Integration

After setting up the environment variables:

1. **Test Backend Connection**: Visit [https://casewise-beta.vercel.app](https://casewise-beta.vercel.app) and check browser console for API connection logs
2. **Test Authentication**: Try logging in with Google OAuth
3. **Test Chat Functionality**: Upload a document and test the AI chat features
4. **Test Concept/Case Isolation**: Verify that each concept and case has its own unique chat

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Ensure backend CORS allows the Vercel domain
2. **Authentication Issues**: Verify Google OAuth client ID is correct
3. **API Connection**: Check that `NEXT_PUBLIC_API_BASE_URL` is set correctly
4. **Environment Variables**: Ensure all variables are set in Vercel dashboard, not just in code
