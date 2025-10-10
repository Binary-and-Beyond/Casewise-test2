# Authentication System

## Overview

The authentication system has been enhanced to provide persistent login functionality, keeping users logged in until they explicitly logout.

## Key Features

### 1. Persistent Login

- Users remain logged in across browser sessions
- Authentication state is preserved in localStorage
- Automatic token verification on app startup

### 2. Token Management

- Automatic token verification every 5 minutes
- Token validation when user returns to the tab
- Automatic cleanup of invalid/expired tokens

### 3. Error Handling

- Graceful handling of authentication failures
- Automatic logout on token expiration
- Clear error messages for authentication issues

### 4. Session Persistence

- Authentication state survives browser refreshes
- Seamless user experience across page reloads
- Automatic re-authentication on app startup

## Implementation Details

### AuthContext (`lib/auth-context.tsx`)

- Manages global authentication state
- Provides login, logout, and token refresh functionality
- Handles automatic token verification
- Monitors browser tab visibility for token refresh

### API Service (`lib/api.ts`)

- Enhanced error handling for 401 responses
- Automatic token cleanup on authentication failures
- Improved CORS error handling

### Main Page (`app/page.tsx`)

- Uses AuthContext for authentication state
- Shows loading spinner during authentication check
- Automatically redirects based on authentication status

## Usage

### Login Flow

1. User enters credentials
2. Token is stored in localStorage
3. User data is fetched and stored
4. User is redirected to dashboard

### Logout Flow

1. Token is removed from localStorage
2. User state is cleared
3. User is redirected to login page

### Token Refresh

- Automatic verification every 5 minutes
- Verification when user returns to tab
- Silent refresh without user interaction

## Security Considerations

- Tokens are stored in localStorage (consider httpOnly cookies for production)
- Automatic cleanup of invalid tokens
- No sensitive data stored in memory
- Proper error handling prevents token leakage

## Testing

To test the authentication persistence:

1. Login to the application
2. Close the browser tab/window
3. Reopen the application
4. User should remain logged in
5. Only logout should end the session
