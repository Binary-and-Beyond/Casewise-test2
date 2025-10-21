import { config } from "./config";
import { handleRateLimit } from "./rate-limiter";

const API_BASE_URL = config.API_BASE_URL;
console.log(API_BASE_URL);

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  bio?: string;
  role?: "user" | "admin";
  created_at: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface SignupRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface Document {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  uploaded_by: string;
  uploaded_at: string;
  content?: string;
}

export interface CaseScenario {
  title: string;
  description: string;
  key_points: string[];
  difficulty: string;
}

export interface CaseGenerationRequest {
  document_id: string;
  prompt: string;
  num_scenarios?: number;
}

export interface CaseGenerationResponse {
  document_id: string;
  prompt: string;
  scenarios: CaseScenario[];
  generated_at: string;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  message: string;
  response: string;
  timestamp: string;
  document_id?: string;
}

export interface ChatSession {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  document_id?: string;
  document_filename?: string;
  document_content_preview?: string;
  message_count: number;
  // Context fields for case/concept specific chats
  case_title?: string;
  concept_title?: string;
  parent_chat_id?: string;
}

export interface CreateChatRequest {
  name?: string;
  document_id?: string;
  // Context fields for case/concept specific chats
  case_title?: string;
  concept_title?: string;
  parent_chat_id?: string;
}

// New chatbot interfaces
export interface CaseTitle {
  id: string;
  title: string;
  description: string;
  difficulty: string;
}

export interface CaseTitlesResponse {
  document_id: string;
  cases: CaseTitle[];
  generated_at: string;
}

export interface MCQOption {
  id: string;
  text: string;
  is_correct: boolean;
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: MCQOption[];
  explanation: string;
  difficulty: string;
  hint?: string;
}

export interface MCQResponse {
  questions: MCQQuestion[];
  generated_at: string;
}

export interface Concept {
  id: string;
  title: string;
  description: string;
  importance: string;
  case_title?: string;
}

export interface ConceptResponse {
  document_id: string;
  concepts: Concept[];
  generated_at: string;
}

export interface AutoGenerationRequest {
  document_id: string;
  generate_cases?: boolean;
  generate_mcqs?: boolean;
  generate_concepts?: boolean;
  generate_titles?: boolean;
  num_cases?: number;
  num_mcqs?: number;
  num_concepts?: number;
  num_titles?: number;
}

export interface AutoGenerationResponse {
  document_id: string;
  cases?: CaseScenario[];
  mcqs?: MCQQuestion[];
  concepts?: Concept[];
  titles?: CaseTitle[];
  generated_at: string;
  success: boolean;
  message: string;
}

export interface UserAnalytics {
  name: string;
  timeSpent: string;
  casesUploaded: number;
  mcqAttempted: number;
  mostQuestionsType: string;
  totalQuestionsCorrect: number;
  totalQuestionsAttempted: number;
  averageScore: number;
  lastActiveDate: string;
}

class ApiService {
  private getAuthToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_token");
    }
    return null;
  }

  private checkAuthentication(): boolean {
    const token = this.getAuthToken();
    if (!token) {
      console.warn("No authentication token found, skipping API call");
      return false;
    }
    return true;
  }

  // Test backend connection
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: "cors",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, message: "Backend connection successful" };
      } else {
        return {
          success: false,
          message: `Backend responded with status: ${response.status}`,
        };
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        return {
          success: false,
          message:
            "CORS Error: Cannot connect to backend. Check if backend is running and CORS is configured.",
        };
      }
      return {
        success: false,
        message: `Connection error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  private getHeaders(): HeadersInit {
    const token = this.getAuthToken();
    console.log("🔍 API Headers - Token present:", !!token);
    console.log("🔍 API Headers - Token length:", token?.length || 0);
    console.log(
      "🔍 API Headers - Token preview:",
      token ? `${token.substring(0, 20)}...` : "None"
    );

    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      console.error("🚨 API Error Response:");
      console.error("🚨 Status:", response.status);
      console.error("🚨 Status Text:", response.statusText);
      console.error("🚨 URL:", response.url);
      console.error(
        "🚨 Headers:",
        Object.fromEntries(response.headers.entries())
      );

      // Handle CORS errors specifically
      if (response.status === 0 || response.type === "opaque") {
        throw new Error(
          "CORS Error: Unable to connect to the backend. Please ensure your backend is running and CORS is properly configured."
        );
      }

      // Handle authentication errors
      if (response.status === 401) {
        // Clear invalid token
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
        }
        throw new Error("Authentication failed. Please log in again.");
      }

      // Handle other HTTP errors
      let errorMessage = `HTTP error! status: ${response.status}`;
      let errorDetails = null;

      try {
        const error = await response.json();
        errorDetails = error;
        errorMessage = error.detail || error.message || errorMessage;
        console.error("🚨 Error Details:", error);
      } catch (parseError) {
        console.error("🚨 Could not parse error response as JSON:", parseError);
        try {
          const errorText = await response.text();
          console.error("🚨 Error Response Text:", errorText);
          errorMessage = errorText || response.statusText || errorMessage;
        } catch (textError) {
          console.error("🚨 Could not read error response as text:", textError);
          errorMessage = response.statusText || errorMessage;
        }
      }

      console.error("🚨 Final Error Message:", errorMessage);
      throw new Error(errorMessage);
    }
    return response.json();
  }

  // Authentication endpoints
  async signup(userData: SignupRequest): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      mode: "cors",
      credentials: "include",
      body: JSON.stringify(userData),
    });
    return this.handleResponse<User>(response);
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    console.log("🔥 FRONTEND: About to call login");
    console.log("URL:", `${API_BASE_URL}/login`);
    console.log("Credentials:", credentials);

    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      mode: "cors",
      credentials: "include",
      body: JSON.stringify(credentials),
    });

    console.log("Response status:", response.status);
    return this.handleResponse<AuthResponse>(response);
  }

  async adminLogin(credentials: LoginRequest): Promise<AuthResponse> {
    console.log("🔥 FRONTEND: About to call admin login");
    console.log("URL:", `${API_BASE_URL}/admin/login`);
    console.log("Credentials:", credentials);

    const response = await fetch(`${API_BASE_URL}/admin/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      mode: "cors",
      credentials: "include",
      body: JSON.stringify(credentials),
    });

    console.log("Response status:", response.status);
    return this.handleResponse<AuthResponse>(response);
  }

  async googleAuth(idToken: string): Promise<AuthResponse> {
    console.log("🔥 FRONTEND: About to call Google auth");
    console.log("URL:", `${API_BASE_URL}/auth/google`);

    const response = await fetch(`${API_BASE_URL}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      mode: "cors",
      credentials: "include",
      body: JSON.stringify({ id_token: idToken }),
    });

    console.log("Google auth response status:", response.status);
    return this.handleResponse<AuthResponse>(response);
  }

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    console.log("🔥 FRONTEND: About to call forgot password");
    console.log("URL:", `${API_BASE_URL}/forgot-password`);
    console.log("Email:", email);

    const response = await fetch(`${API_BASE_URL}/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      mode: "cors",
      credentials: "include",
      body: JSON.stringify({ email }),
    });

    console.log("Forgot password response status:", response.status);
    return this.handleResponse<ForgotPasswordResponse>(response);
  }

  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<ResetPasswordResponse> {
    console.log("🔥 FRONTEND: About to call reset password");
    console.log("URL:", `${API_BASE_URL}/reset-password`);
    console.log("Token:", token.substring(0, 8) + "...");

    const response = await fetch(`${API_BASE_URL}/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      mode: "cors",
      credentials: "include",
      body: JSON.stringify({ token, new_password: newPassword }),
    });

    console.log("Reset password response status:", response.status);
    return this.handleResponse<ResetPasswordResponse>(response);
  }

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: "GET",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
    });
    return this.handleResponse<User>(response);
  }

  async getAllUsers(): Promise<{ users: any[] }> {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: "GET",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
    });
    return this.handleResponse<{ users: any[] }>(response);
  }

  // Document endpoints
  async uploadDocument(file: File): Promise<Document> {
    const formData = new FormData();
    formData.append("file", file);

    const token = this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      mode: "cors",
      credentials: "include",
      body: formData,
    });
    return this.handleResponse<Document>(response);
  }

  async uploadDocumentEnhanced(file: File): Promise<Document> {
    const formData = new FormData();
    formData.append("file", file);

    const token = this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/documents/upload-enhanced`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      mode: "cors",
      credentials: "include",
      body: formData,
    });
    return this.handleResponse<Document>(response);
  }

  async getExtractedContent(documentId: string): Promise<any> {
    const token = this.getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/documents/${documentId}/extracted-content`,
      {
        method: "GET",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          "Content-Type": "application/json",
        },
        mode: "cors",
        credentials: "include",
      }
    );
    return this.handleResponse<any>(response);
  }

  // Profile management endpoints
  async updateProfile(profileData: any): Promise<User> {
    const token = this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: "PUT",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        "Content-Type": "application/json",
      },
      mode: "cors",
      credentials: "include",
      body: JSON.stringify(profileData),
    });
    return this.handleResponse<User>(response);
  }

  async changePassword(passwordData: {
    current_password: string;
    new_password: string;
  }): Promise<any> {
    const token = this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/profile/password`, {
      method: "PUT",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        "Content-Type": "application/json",
      },
      mode: "cors",
      credentials: "include",
      body: JSON.stringify(passwordData),
    });
    return this.handleResponse<any>(response);
  }

  async updateMCQAnalytics(data: {
    correct_answers: number;
    total_questions: number;
    case_id?: string;
  }): Promise<any> {
    console.log("🌐 API: Updating MCQ analytics...");
    console.log("🌐 API: Data:", data);
    console.log("🌐 API: Headers:", this.getHeaders());
    console.log("🌐 API: URL:", `${API_BASE_URL}/analytics/mcq-completion`);

    const response = await fetch(`${API_BASE_URL}/analytics/mcq-completion`, {
      method: "POST",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
      body: JSON.stringify(data),
    });

    console.log("🌐 API: Update analytics response status:", response.status);
    console.log("🌐 API: Update analytics response ok:", response.ok);

    if (!response.ok) {
      console.log(
        "🌐 API: Update analytics response not ok, trying to get error details..."
      );
      try {
        const errorText = await response.text();
        console.log("🌐 API: Update analytics error response text:", errorText);
      } catch (e) {
        console.log("🌐 API: Could not read update analytics error response");
      }
      throw new Error(`Failed to update analytics: ${response.statusText}`);
    }
    return this.handleResponse<any>(response);
  }

  async clearAnalytics(): Promise<any> {
    console.log("🌐 API: Clearing user analytics...");
    console.log("🌐 API: Headers:", this.getHeaders());
    console.log("🌐 API: URL:", `${API_BASE_URL}/analytics/clear`);

    const response = await fetch(`${API_BASE_URL}/analytics/clear`, {
      method: "POST",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
    });

    console.log("🌐 API: Clear analytics response status:", response.status);
    console.log("🌐 API: Clear analytics response ok:", response.ok);

    if (!response.ok) {
      console.log(
        "🌐 API: Clear analytics response not ok, trying to get error details..."
      );
      try {
        const errorText = await response.text();
        console.log("🌐 API: Clear analytics error response text:", errorText);
      } catch (e) {
        console.log("🌐 API: Could not read clear analytics error response");
      }
      throw new Error(`Failed to clear analytics: ${response.statusText}`);
    }
    return this.handleResponse<any>(response);
  }

  async uploadProfileImage(file: File): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);

    const token = this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/profile/upload-image`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      mode: "cors",
      credentials: "include",
      body: formData,
    });
    return this.handleResponse<any>(response);
  }

  // Notification endpoints
  async getNotifications(
    limit: number = 50,
    unreadOnly: boolean = false
  ): Promise<any[]> {
    const token = this.getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/notifications?limit=${limit}&unread_only=${unreadOnly}`,
      {
        method: "GET",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          "Content-Type": "application/json",
        },
        mode: "cors",
        credentials: "include",
      }
    );
    return this.handleResponse<any[]>(response);
  }

  async markNotificationRead(notificationId: string): Promise<any> {
    const token = this.getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/notifications/${notificationId}/read`,
      {
        method: "PUT",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          "Content-Type": "application/json",
        },
        mode: "cors",
        credentials: "include",
      }
    );
    return this.handleResponse<any>(response);
  }

  async markAllNotificationsRead(): Promise<any> {
    const token = this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: "PUT",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        "Content-Type": "application/json",
      },
      mode: "cors",
      credentials: "include",
    });
    return this.handleResponse<any>(response);
  }

  async getUnreadCount(): Promise<{ unread_count: number }> {
    const token = this.getAuthToken();
    const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
      method: "GET",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        "Content-Type": "application/json",
      },
      mode: "cors",
      credentials: "include",
    });
    return this.handleResponse<{ unread_count: number }>(response);
  }

  // AI endpoints
  async generateCases(
    request: CaseGenerationRequest
  ): Promise<CaseGenerationResponse> {
    const response = await fetch(`${API_BASE_URL}/ai/generate-cases`, {
      method: "POST",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
      body: JSON.stringify(request),
    });
    return this.handleResponse<CaseGenerationResponse>(response);
  }

  // Chat endpoints
  async sendChatMessage(
    message: string,
    documentId?: string
  ): Promise<{ response: string }> {
    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: "POST",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
      body: JSON.stringify({ message, document_id: documentId }),
    });
    return this.handleResponse<{ response: string }>(response);
  }

  // Chat session management
  async createChat(request: CreateChatRequest): Promise<ChatSession> {
    console.log("🌐 API: Creating chat...");
    console.log("🌐 API: Request data:", request);
    console.log("🌐 API: Headers:", this.getHeaders());
    console.log("🌐 API: URL:", `${API_BASE_URL}/chats`);

    const response = await fetch(`${API_BASE_URL}/chats`, {
      method: "POST",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
      body: JSON.stringify(request),
    });

    console.log("🌐 API: Create chat response status:", response.status);
    console.log("🌐 API: Create chat response ok:", response.ok);

    if (!response.ok) {
      console.log(
        "🌐 API: Create chat response not ok, trying to get error details..."
      );
      try {
        const errorText = await response.text();
        console.log("🌐 API: Create chat error response text:", errorText);
      } catch (e) {
        console.log("🌐 API: Could not read create chat error response");
      }
    }

    return this.handleResponse<ChatSession>(response);
  }

  async getOrCreateContextChat(
    request: CreateChatRequest
  ): Promise<ChatSession> {
    console.log("🌐 API: Getting or creating context chat...");
    console.log("🌐 API: Request data:", request);
    console.log("🌐 API: Headers:", this.getHeaders());
    console.log("🌐 API: URL:", `${API_BASE_URL}/chats/context`);

    const response = await fetch(`${API_BASE_URL}/chats/context`, {
      method: "POST",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
      body: JSON.stringify(request),
    });

    console.log("🌐 API: Context chat response status:", response.status);
    console.log("🌐 API: Context chat response ok:", response.ok);

    if (!response.ok) {
      console.log(
        "🌐 API: Context chat response not ok, trying to get error details..."
      );
      try {
        const errorText = await response.text();
        console.log("🌐 API: Context chat error response text:", errorText);
      } catch (e) {
        console.log("🌐 API: Could not read context chat error response");
      }
    }

    return this.handleResponse<ChatSession>(response);
  }

  async getUserChats(): Promise<ChatSession[]> {
    if (!this.checkAuthentication()) {
      console.log("🌐 API: No authentication token, returning empty chats");
      return [];
    }

    console.log("🌐 API: Getting user chats...");
    console.log("🌐 API: Headers:", this.getHeaders());
    console.log("🌐 API: URL:", `${API_BASE_URL}/chats`);

    const response = await fetch(`${API_BASE_URL}/chats`, {
      method: "GET",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
    });

    console.log("🌐 API: Response status:", response.status);
    console.log("🌐 API: Response ok:", response.ok);

    if (!response.ok) {
      console.log("🌐 API: Response not ok, trying to get error details...");
      try {
        const errorText = await response.text();
        console.log("🌐 API: Error response text:", errorText);
      } catch (e) {
        console.log("🌐 API: Could not read error response");
      }
    }

    return this.handleResponse<ChatSession[]>(response);
  }

  async getChat(chatId: string): Promise<ChatSession> {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
      method: "GET",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
    });
    return this.handleResponse<ChatSession>(response);
  }

  async deleteChat(chatId: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
      method: "DELETE",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
    });
    return this.handleResponse<{ message: string }>(response);
  }

  async updateChatDocument(
    chatId: string,
    documentId: string
  ): Promise<ChatSession> {
    const response = await fetch(
      `${API_BASE_URL}/chats/${chatId}/document?document_id=${documentId}`,
      {
        method: "PUT",
        headers: this.getHeaders(),
        mode: "cors",
        credentials: "include",
      }
    );
    return this.handleResponse<ChatSession>(response);
  }

  async saveGeneratedContent(
    chatId: string,
    content: any
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/chats/${chatId}/content/save`,
      {
        method: "POST",
        headers: this.getHeaders(),
        mode: "cors",
        credentials: "include",
        body: JSON.stringify(content),
      }
    );
    return this.handleResponse<{ message: string }>(response);
  }

  async getGeneratedContent(chatId: string): Promise<{
    cases: any[];
    mcqs: any[];
    concepts: any[];
  }> {
    console.log("🌐 API: Getting generated content for chat:", chatId);
    console.log("🌐 API: Chat ID type:", typeof chatId);
    console.log("🌐 API: Chat ID length:", chatId?.length);
    console.log("🌐 API: URL:", `${API_BASE_URL}/chats/${chatId}/content`);

    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/content`, {
      method: "GET",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
    });

    console.log("🌐 API: Get content response status:", response.status);
    console.log("🌐 API: Get content response ok:", response.ok);

    if (!response.ok) {
      console.log(
        "🌐 API: Get content response not ok, trying to get error details..."
      );
      try {
        const errorText = await response.text();
        console.log("🌐 API: Get content error response text:", errorText);
      } catch (e) {
        console.log("🌐 API: Could not read get content error response");
      }
    }

    return this.handleResponse<{
      cases: any[];
      mcqs: any[];
      concepts: any[];
    }>(response);
  }

  async sendChatMessageToSession(
    chatId: string,
    message: string,
    documentId?: string
  ): Promise<ChatMessage> {
    return handleRateLimit(async () => {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
        method: "POST",
        headers: this.getHeaders(),
        mode: "cors",
        credentials: "include",
        body: JSON.stringify({ message, document_id: documentId }),
      });
      return this.handleResponse<ChatMessage>(response);
    });
  }

  async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    console.log("🌐 API: Getting chat messages for chat:", chatId);
    console.log("🌐 API: Chat ID type:", typeof chatId);
    console.log("🌐 API: Chat ID length:", chatId?.length);
    console.log("🌐 API: URL:", `${API_BASE_URL}/chats/${chatId}/messages`);

    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
      method: "GET",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
    });

    console.log("🌐 API: Get messages response status:", response.status);
    console.log("🌐 API: Get messages response ok:", response.ok);

    if (!response.ok) {
      console.log(
        "🌐 API: Get messages response not ok, trying to get error details..."
      );
      try {
        const errorText = await response.text();
        console.log("🌐 API: Get messages error response text:", errorText);
      } catch (e) {
        console.log("🌐 API: Could not read get messages error response");
      }
    }

    return this.handleResponse<ChatMessage[]>(response);
  }

  // New chatbot endpoints
  async generateCaseTitles(
    documentId: string,
    numCases: number = 5
  ): Promise<CaseTitlesResponse> {
    const response = await fetch(`${API_BASE_URL}/ai/generate-case-titles`, {
      method: "POST",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
      body: JSON.stringify({ document_id: documentId, num_cases: numCases }),
    });
    return this.handleResponse<CaseTitlesResponse>(response);
  }

  async generateMCQs(
    documentId?: string,
    caseTitle?: string,
    numQuestions: number = 3,
    includeHints: boolean = true
  ): Promise<MCQResponse> {
    const response = await fetch(`${API_BASE_URL}/ai/generate-mcqs`, {
      method: "POST",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
      body: JSON.stringify({
        document_id: documentId,
        case_title: caseTitle,
        num_questions: numQuestions,
        include_hints: includeHints,
      }),
    });
    return this.handleResponse<MCQResponse>(response);
  }

  async identifyConcepts(
    documentId: string,
    numConcepts: number = 3
  ): Promise<ConceptResponse> {
    const response = await fetch(`${API_BASE_URL}/ai/identify-concepts`, {
      method: "POST",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
      body: JSON.stringify({
        document_id: documentId,
        num_concepts: numConcepts,
      }),
    });
    return this.handleResponse<ConceptResponse>(response);
  }

  async autoGenerateContent(
    request: AutoGenerationRequest
  ): Promise<AutoGenerationResponse> {
    return handleRateLimit(async () => {
      const response = await fetch(`${API_BASE_URL}/ai/auto-generate`, {
        method: "POST",
        headers: this.getHeaders(),
        mode: "cors",
        credentials: "include",
        body: JSON.stringify(request),
      });
      return this.handleResponse<AutoGenerationResponse>(response);
    });
  }

  async quickGenerateContent(request: AutoGenerationRequest): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/ai/quick-generate`, {
      method: "POST",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
      body: JSON.stringify(request),
    });
    return this.handleResponse<any>(response);
  }

  async getUserAnalytics(): Promise<UserAnalytics> {
    console.log("🌐 API: Getting user analytics...");
    console.log("🌐 API: Headers:", this.getHeaders());
    console.log("🌐 API: URL:", `${API_BASE_URL}/analytics/user`);

    const response = await fetch(`${API_BASE_URL}/analytics/user`, {
      method: "GET",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
    });

    console.log("🌐 API: Get analytics response status:", response.status);
    console.log("🌐 API: Get analytics response ok:", response.ok);

    if (!response.ok) {
      console.log(
        "🌐 API: Get analytics response not ok, trying to get error details..."
      );
      try {
        const errorText = await response.text();
        console.log("🌐 API: Get analytics error response text:", errorText);
      } catch (e) {
        console.log("🌐 API: Could not read get analytics error response");
      }
      throw new Error(`Failed to get user analytics: ${response.statusText}`);
    }
    return this.handleResponse<UserAnalytics>(response);
  }
}

export const apiService = new ApiService();
