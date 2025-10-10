# CaseWise Frontend Integration Setup

This document explains how to set up and run the CaseWise frontend with the integrated backend API.

## Prerequisites

- Node.js 18+ and npm/pnpm
- Your FastAPI backend running on `http://localhost:8000`
- MongoDB database configured in your backend

## Environment Setup

1. Create a `.env.local` file in the root directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

2. If your backend is running on a different port or domain, update the URL accordingly.

## Installation

1. Install dependencies:

```bash
npm install
# or
pnpm install
```

2. Start the development server:

```bash
npm run dev
# or
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Backend Integration Features

### ✅ Completed Integrations

1. **Authentication System**

   - User signup with email, username, and password
   - User login with JWT token management
   - Automatic token storage and refresh
   - Protected routes and API calls

2. **File Upload System**

   - Drag and drop file upload
   - Support for PDF, DOC, DOCX, TXT, and Markdown files
   - Real-time upload progress and error handling
   - Document storage in MongoDB via backend API

3. **AI Chat System**

   - Interactive chat interface on the Explore Cases page
   - Real-time messaging with AI responses
   - Document context awareness
   - Message history and timestamps

4. **Case Generation**
   - AI-powered case scenario generation from uploaded documents
   - Integration with Gemini AI via backend
   - Dynamic case list updates
   - Multiple difficulty levels and medical specialties

### 🔧 Backend API Endpoints Used

- `POST /signup` - User registration
- `POST /login` - User authentication
- `GET /me` - Get current user info
- `POST /documents/upload` - File upload
- `POST /ai/generate-cases` - Generate case scenarios

### 🚧 Additional Backend Endpoint Needed

To complete the AI chat functionality, you'll need to add this endpoint to your backend:

```python
@app.post("/ai/chat")
async def chat_with_ai(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Chat with AI about uploaded documents"""
    message = request.get("message")
    document_id = request.get("document_id")

    # Your AI chat logic here
    # Return: {"response": "AI response text"}
```

## Usage Flow

1. **Sign Up/Login**: Create an account or log in with existing credentials
2. **Upload Document**: Drag and drop or select a medical document
3. **Generate Cases**: Click "Generate New Cases" to create AI-generated scenarios
4. **Select Case**: Choose a case from the generated list
5. **Explore Case**: Use the AI chat to ask questions about the case
6. **Additional Features**: Generate MCQs or identify concepts

## File Structure

```
lib/
├── api.ts              # API service layer
├── auth-context.tsx    # Authentication context
├── config.ts           # Configuration settings
└── utils.ts            # Utility functions

components/
├── widgets/
│   ├── ai-chat.tsx     # AI chat component
│   └── file-upload-area.tsx # File upload component
├── login-form.tsx      # Updated with API integration
├── signup-form.tsx     # Updated with API integration
└── dashboard.tsx       # Main dashboard with all integrations
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your backend has CORS enabled for `http://localhost:3000`
2. **Authentication Errors**: Check that JWT tokens are being stored correctly
3. **File Upload Issues**: Verify file size limits and allowed file types
4. **API Connection**: Ensure backend is running on the correct port

### Debug Mode

Enable debug logging by adding to your `.env.local`:

```bash
NEXT_PUBLIC_DEBUG=true
```

## Next Steps

1. Add the missing `/ai/chat` endpoint to your backend
2. Implement real-time chat functionality
3. Add more AI features like concept identification
4. Enhance the MCQ generation system
5. Add user analytics and progress tracking

## Support

For issues or questions about the integration, check:

- Backend API documentation
- Browser console for frontend errors
- Network tab for API call debugging
