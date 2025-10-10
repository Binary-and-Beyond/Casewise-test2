import { config } from "./config";

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
  created_at: string;
  updated_at?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
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
  message_count: number;
}

export interface CreateChatRequest {
  name?: string;
  document_id?: string;
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

class ApiService {
  private getAuthToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_token");
    }
    return null;
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
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
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
      try {
        const error = await response.json();
        errorMessage = error.detail || error.message || errorMessage;
      } catch {
        // If we can't parse the error response, use the status text
        errorMessage = response.statusText || errorMessage;
      }

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

  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: "GET",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
    });
    return this.handleResponse<User>(response);
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
    const response = await fetch(`${API_BASE_URL}/chats`, {
      method: "POST",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
      body: JSON.stringify(request),
    });
    return this.handleResponse<ChatSession>(response);
  }

  async getUserChats(): Promise<ChatSession[]> {
    const response = await fetch(`${API_BASE_URL}/chats`, {
      method: "GET",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
    });
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

  async sendChatMessageToSession(
    chatId: string,
    message: string,
    documentId?: string
  ): Promise<ChatMessage> {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
      method: "POST",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
      body: JSON.stringify({ message, document_id: documentId }),
    });
    return this.handleResponse<ChatMessage>(response);
  }

  async getChatMessages(chatId: string): Promise<ChatMessage[]> {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
      method: "GET",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
    });
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
    caseId?: string,
    numQuestions: number = 3
  ): Promise<MCQResponse> {
    const response = await fetch(`${API_BASE_URL}/ai/generate-mcqs`, {
      method: "POST",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
      body: JSON.stringify({
        document_id: documentId,
        case_id: caseId,
        num_questions: numQuestions,
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
    const response = await fetch(`${API_BASE_URL}/ai/auto-generate`, {
      method: "POST",
      headers: this.getHeaders(),
      mode: "cors",
      credentials: "include",
      body: JSON.stringify(request),
    });
    return this.handleResponse<AutoGenerationResponse>(response);
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
}

export const apiService = new ApiService();
