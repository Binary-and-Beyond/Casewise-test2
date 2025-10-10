# CORS Troubleshooting Guide

## Common CORS Issues and Solutions

### 1. **Backend CORS Configuration**

Update your `main.py` with the comprehensive CORS configuration from `backend-cors-fix.py`:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",    # Next.js default
        "http://localhost:3001",    # Alternative Next.js port
        "http://localhost:8080",    # Alternative frontend port
        "http://localhost:5173",    # Vite default
        "http://127.0.0.1:3000",   # Alternative localhost
        "http://127.0.0.1:3001",   # Alternative localhost
        "http://127.0.0.1:8080",   # Alternative localhost
        "http://127.0.0.1:5173",   # Alternative localhost
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
    ],
    expose_headers=["*"],
    max_age=3600,
)
```

### 2. **Frontend Environment Configuration**

Create a `.env.local` file in your frontend root directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. **Testing Connection**

Use the built-in connection test component on the main dashboard to diagnose issues.

### 4. **Common Error Messages and Solutions**

#### Error: "CORS Error: Unable to connect to the backend"

**Solution:**

- Ensure your backend is running on `http://localhost:8000`
- Check that the CORS middleware is properly configured
- Verify the frontend is running on `http://localhost:3000`

#### Error: "Access to fetch at 'http://localhost:8000' from origin 'http://localhost:3000' has been blocked by CORS policy"

**Solution:**

- Add your frontend URL to the `allow_origins` list in backend CORS configuration
- Restart your backend server after making CORS changes

#### Error: "Network Error" or "Failed to fetch"

**Solution:**

- Check if backend server is running
- Verify the API_BASE_URL in your environment variables
- Check firewall settings

### 5. **Development vs Production**

#### Development (localhost):

```python
allow_origins=[
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]
```

#### Production:

```python
allow_origins=[
    "https://your-frontend-domain.com",
    "https://www.your-frontend-domain.com",
]
```

### 6. **Quick Fixes**

#### Option 1: Allow All Origins (Development Only)

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=False,  # Must be False when allow_origins is ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Option 2: Add Preflight Handler

```python
@app.options("/{path:path}")
async def options_handler(path: str):
    return {"message": "OK"}
```

### 7. **Browser Developer Tools**

1. Open browser Developer Tools (F12)
2. Go to Network tab
3. Look for failed requests (red entries)
4. Check the Console tab for CORS error messages
5. Look for OPTIONS requests that might be failing

### 8. **Backend Server Restart**

After making CORS changes, always restart your backend server:

```bash
# If using uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# If using your existing setup
python main.py
```

### 9. **Verification Steps**

1. **Backend Health Check:**

   ```bash
   curl http://localhost:8000/
   ```

2. **Frontend Connection Test:**

   - Use the Connection Test component on the dashboard
   - Check browser console for errors

3. **Manual API Test:**
   ```bash
   curl -X POST http://localhost:8000/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","username":"testuser","password":"testpass123"}'
   ```

### 10. **Still Having Issues?**

1. Check if both frontend and backend are running
2. Verify port numbers match your configuration
3. Try accessing the backend directly in your browser
4. Check for any proxy or firewall settings
5. Ensure no other services are using the same ports

### 11. **Alternative Ports**

If you're using different ports, update both:

**Frontend (.env.local):**

```bash
NEXT_PUBLIC_API_URL=http://localhost:YOUR_BACKEND_PORT
```

**Backend (main.py):**

```python
allow_origins=[
    "http://localhost:YOUR_FRONTEND_PORT",
    "http://127.0.0.1:YOUR_FRONTEND_PORT",
]
```
