# Google OAuth Setup Guide

## Current Issue

The Google OAuth login is failing with these errors:

- `ERR_FAILED` when fetching the ID assertion endpoint
- `Server did not send the correct CORS headers`
- `IdentityCredentialError: Error retrieving a token`

## Root Cause

The Google OAuth Client ID is not configured. The environment variables are missing.

## Setup Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (or Google Identity API)

### Step 2: Create OAuth 2.0 Credentials

1. Go to "Credentials" in the Google Cloud Console
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Choose "Web application"
4. Add authorized origins:
   - `http://localhost:3001` (for development)
   - `http://localhost:3000` (backup)
   - Your production domain (when deploying)
5. Add authorized redirect URIs:
   - `http://localhost:3001` (for development)
   - Your production domain (when deploying)
6. Copy the Client ID

### Step 3: Configure Environment Variables

#### Frontend (.env.local)

Create a file called `.env.local` in the root directory:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-actual-client-id-here
```

#### Backend (Casewise-backend/.env)

Create a file called `.env` in the `Casewise-backend` directory:

```bash
GOOGLE_CLIENT_ID=your-actual-client-id-here
```

### Step 4: Restart Services

After setting up the environment variables:

1. Stop the frontend server (Ctrl+C)
2. Stop the backend server (Ctrl+C)
3. Restart both servers:

   ```bash
   # Frontend
   npm run dev

   # Backend
   cd Casewise-backend
   python main.py
   ```

### Step 5: Test Google OAuth

1. Go to the login page
2. Click "Log in with Google"
3. You should see a Google OAuth popup
4. Complete the authentication flow

## Troubleshooting

### If you still get errors:

1. **Check environment variables**: Make sure both `.env.local` and `Casewise-backend/.env` have the correct Client ID
2. **Verify Google Cloud settings**: Ensure the authorized origins include `http://localhost:3001`
3. **Check console logs**: Look for any error messages in the browser console
4. **Restart servers**: Always restart both frontend and backend after changing environment variables

### Common Issues:

- **"Google OAuth not configured"**: Environment variable is missing or incorrect
- **CORS errors**: Backend CORS is configured correctly, but Google OAuth might need additional setup
- **"Google authentication not available"**: Google Identity Services script failed to load

## Files Modified

- `components/login-form.tsx` - Added better error handling
- `components/signup-form.tsx` - Added better error handling
- `env.sample` - Created sample environment file

## Next Steps

1. Follow the setup instructions above
2. Test Google OAuth login
3. If issues persist, check the browser console for specific error messages
