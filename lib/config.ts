// Configuration for the application
export const config = {
  // Backend API URL - update this to match your backend server
  API_BASE_URL: "http://localhost:8000",

  // File upload settings
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    "text/plain",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/markdown",
  ],

  // Chat settings
  MAX_CHAT_MESSAGES: 100,
  CHAT_DEBOUNCE_MS: 300,
};

// Environment check
export const isDevelopment = process.env.NODE_ENV === "development";
export const isProduction = process.env.NODE_ENV === "production";
