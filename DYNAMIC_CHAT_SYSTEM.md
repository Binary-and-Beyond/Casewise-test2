# Dynamic Chat System

## Overview

The chat system has been completely redesigned to be dynamic and integrated with the backend. Chats are now created on-demand and managed through the database.

## Key Features

### 1. Dynamic Chat Creation

- **New Chat Button**: Click "+ New" in the sidebar to create a new chat
- **Auto-Creation**: New chats are automatically created when uploading documents
- **Smart Naming**: Chat names are generated dynamically based on:
  - Document filename (if document is uploaded)
  - Timestamp (for general chats)

### 2. Backend Integration

- **Database Storage**: All chats and messages are stored in MongoDB
- **User Isolation**: Each user only sees their own chats
- **Message History**: Complete conversation history is preserved
- **Real-time Updates**: Chat metadata updates automatically

### 3. Enhanced UI/UX

- **Chat List**: Shows all user chats with message counts
- **Delete Functionality**: Hover over chats to see delete option
- **Message Counter**: See how many messages in each chat
- **File Indicators**: Green dot shows chats with uploaded files

## Backend Endpoints

### Chat Management

- `POST /chats` - Create a new chat
- `GET /chats` - Get all user chats
- `GET /chats/{chat_id}` - Get specific chat
- `DELETE /chats/{chat_id}` - Delete chat and all messages

### Message Management

- `POST /chats/{chat_id}/messages` - Send message to chat
- `GET /chats/{chat_id}/messages` - Get all messages in chat

## Frontend Components

### Dashboard (`components/dashboard.tsx`)

- Manages chat state and API calls
- Handles file uploads and chat creation
- Coordinates between sidebar and chat components

### Sidebar (`components/layout/sidebar.tsx`)

- Displays dynamic chat list
- Provides "New Chat" button
- Shows delete functionality
- Displays message counts and file indicators

### AI Chat (`components/widgets/ai-chat.tsx`)

- Integrates with chat session API
- Handles message sending and receiving
- Displays conversation history
- Real-time message updates

## Database Schema

### Chats Collection

```json
{
  "_id": "ObjectId",
  "name": "Chat - Document Name",
  "user_id": "user_id",
  "document_id": "document_id (optional)",
  "message_count": 5,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Chat Messages Collection

```json
{
  "_id": "ObjectId",
  "chat_id": "chat_id",
  "message": "user message",
  "response": "AI response",
  "document_id": "document_id (optional)",
  "timestamp": "datetime"
}
```

## Usage Flow

### Creating a New Chat

1. Click "+ New" button in sidebar
2. Chat is created with timestamp-based name
3. User can immediately start chatting
4. Chat appears in sidebar list

### Uploading a Document

1. Upload file through dashboard
2. New chat is automatically created
3. Chat name includes document filename
4. Document is associated with the chat

### Chatting

1. Select a chat from sidebar
2. Type message and press Enter
3. AI responds using document context (if available)
4. Message count updates automatically

### Managing Chats

1. Hover over chat in sidebar
2. Click delete button (X) to remove chat
3. All messages in chat are also deleted
4. System automatically switches to another chat

## Benefits

### For Users

- **Organized**: Each conversation is separate
- **Persistent**: All chats saved across sessions
- **Contextual**: Document-based chats have relevant context
- **Flexible**: Create as many chats as needed

### For Development

- **Scalable**: Database-backed storage
- **Maintainable**: Clean separation of concerns
- **Extensible**: Easy to add new features
- **Reliable**: Proper error handling and validation

## Technical Implementation

### State Management

- Chat list managed in dashboard component
- Messages loaded per chat selection
- Real-time updates through API calls
- Optimistic UI updates for better UX

### Error Handling

- Graceful fallbacks for API failures
- User-friendly error messages
- Automatic retry mechanisms
- Proper loading states

### Performance

- Lazy loading of chat messages
- Efficient database queries
- Optimized re-renders
- Minimal API calls

This dynamic chat system provides a much better user experience with proper data persistence and organization.
