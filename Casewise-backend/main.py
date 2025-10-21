from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from datetime import datetime, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager
import hashlib
import os
import re
from dotenv import load_dotenv
import pymongo      
from bson import ObjectId
from pydantic import BaseModel, Field, EmailStr, field_validator
import google.generativeai as genai
import io
import mimetypes
# import jwt  # Temporarily disabled due to library conflicts
import base64
import hmac
import hashlib
import json
import re
from typing import List, Dict, Optional
from google.oauth2 import id_token
from google.auth.transport import requests
import time
from collections import defaultdict, deque
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import secrets
import string
# Try to import PDF processing libraries
PDF_AVAILABLE = False
PDF_LIBRARY = None

try:
    import pypdf
    PDF_AVAILABLE = True
    PDF_LIBRARY = "pypdf"
    print("pypdf available for PDF processing")
except ImportError:
    try:
        import PyPDF2
        PDF_AVAILABLE = True
        PDF_LIBRARY = "PyPDF2"
        print("PyPDF2 available for PDF processing")
    except ImportError:
        PDF_AVAILABLE = False
        PDF_LIBRARY = None
        print("No PDF processing library available - PDF processing will use fallback content")


load_dotenv()

class PDFContentExtractor:
    """Enhanced PDF content extractor for medical cases and MCQs"""
    
    def __init__(self):
        self.case_keywords = [
            "case", "patient", "history", "presentation", 
            "chief complaint", "diagnosis", "treatment"
        ]
        self.mcq_keywords = [
            "question", "which of the following", "what is",
            "a)", "b)", "c)", "d)", "e)", "answer:"
        ]
    
    def extract_text_from_pdf(self, pdf_content: bytes) -> Dict[str, any]:
        """Extract text and structure from PDF"""
        try:
            pdf_reader = pypdf.PdfReader(io.BytesIO(pdf_content))
            
            result = {
                "full_text": "",
                "pages": [],
                "total_pages": len(pdf_reader.pages),
                "detected_cases": [],
                "detected_mcqs": [],
                "has_cases": False,
                "has_mcqs": False
            }
            
            # Extract text from each page
            for page_num, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                
                if page_text.strip():
                    result["full_text"] += f"\n--- Page {page_num + 1} ---\n"
                    result["full_text"] += page_text
                    
                    result["pages"].append({
                        "page_number": page_num + 1,
                        "text": page_text,
                        "char_count": len(page_text)
                    })
            
            # Detect cases and MCQs
            result["detected_cases"] = self.detect_cases(result["full_text"])
            result["detected_mcqs"] = self.detect_mcqs(result["full_text"])
            
            result["has_cases"] = len(result["detected_cases"]) > 0
            result["has_mcqs"] = len(result["detected_mcqs"]) > 0
            
            return result
            
        except Exception as e:
            raise Exception(f"PDF extraction failed: {str(e)}")
    
    def detect_cases(self, text: str) -> List[Dict[str, str]]:
        """Detect medical cases in text"""
        cases = []
        
        # Pattern 1: "Case X:" or "CASE X:"
        case_pattern = r'(?:CASE|Case)\s+(\d+|[IVX]+)[:\.]?\s*\n?(.*?)(?=(?:CASE|Case)\s+\d+|$)'
        matches = re.finditer(case_pattern, text, re.IGNORECASE | re.DOTALL)
        
        for match in matches:
            case_num = match.group(1)
            case_text = match.group(2).strip()
            
            if len(case_text) > 50:  # Minimum length for a valid case
                cases.append({
                    "case_number": case_num,
                    "content": case_text[:1000],  # First 1000 chars
                    "full_content": case_text,
                    "type": "numbered_case"
                })
        
        # Pattern 2: Patient presentation blocks
        patient_pattern = r'(?:Patient|PATIENT)[:\s]+(.*?)(?=(?:Patient|PATIENT|Question|QUESTION)|$)'
        patient_matches = re.finditer(patient_pattern, text, re.IGNORECASE | re.DOTALL)
        
        for match in patient_matches:
            patient_text = match.group(1).strip()
            
            if len(patient_text) > 100 and self._contains_case_elements(patient_text):
                cases.append({
                    "case_number": f"P{len(cases) + 1}",
                    "content": patient_text[:1000],
                    "full_content": patient_text,
                    "type": "patient_presentation"
                })
        
        return cases
    
    def detect_mcqs(self, text: str) -> List[Dict[str, any]]:
        """Detect MCQ questions in text"""
        mcqs = []
        
        # Pattern: Question followed by options A) B) C) D) E)
        question_pattern = r'(?:Question\s+(\d+)|(\d+)[\.)]\s*)([^\n]+\?)\s*\n((?:[A-E][\.)]\s*[^\n]+\s*\n?)+)'
        
        matches = re.finditer(question_pattern, text, re.IGNORECASE | re.MULTILINE)
        
        for match in matches:
            q_num = match.group(1) or match.group(2)
            question_text = match.group(3).strip()
            options_text = match.group(4).strip()
            
            # Extract options
            options = self._extract_options(options_text)
            
            if len(options) >= 4:  # Valid MCQ should have at least 4 options
                mcqs.append({
                    "question_number": q_num or str(len(mcqs) + 1),
                    "question": question_text,
                    "options": options,
                    "raw_text": match.group(0)
                })
        
        # Alternative pattern: Questions without explicit numbering
        if len(mcqs) == 0:
            # Look for question marks followed by options
            alt_pattern = r'([^\n]+\?)\s*\n((?:[A-E][\.)]\s*[^\n]+\s*\n?){4,})'
            alt_matches = re.finditer(alt_pattern, text, re.MULTILINE)
            
            for match in alt_matches:
                question_text = match.group(1).strip()
                options_text = match.group(2).strip()
                
                options = self._extract_options(options_text)
                
                if len(options) >= 4:
                    mcqs.append({
                        "question_number": str(len(mcqs) + 1),
                        "question": question_text,
                        "options": options,
                        "raw_text": match.group(0)
                    })
        
        return mcqs
    
    def _extract_options(self, options_text: str) -> List[Dict[str, str]]:
        """Extract individual options from options text"""
        options = []
        
        # Pattern for options: A) or A. followed by text
        option_pattern = r'([A-E])[\.)]\s*([^\n]+)'
        matches = re.finditer(option_pattern, options_text, re.IGNORECASE)
        
        for match in matches:
            option_id = match.group(1).upper()
            option_text = match.group(2).strip()
            
            options.append({
                "id": option_id,
                "text": option_text
            })
        
        return options
    
    def _contains_case_elements(self, text: str) -> bool:
        """Check if text contains typical case elements"""
        text_lower = text.lower()
        
        case_indicators = [
            "age", "year", "old", "male", "female",
            "complain", "present", "history",
            "symptom", "sign", "examination",
            "diagnosis", "treatment"
        ]
        
        matches = sum(1 for indicator in case_indicators if indicator in text_lower)
        return matches >= 3

MONGODB_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME")
SECRET_KEY = os.getenv("SECRET_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
ALGORITHM = "HS256"

# Configure Gemini AI
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Simple password hashing with SHA-256
security = HTTPBearer()


client = None
db = None

def connect_to_mongodb():
    global client, db
    try:
        client = pymongo.MongoClient(MONGODB_URL)
        db = client[DATABASE_NAME]
        
        client.server_info()
        print(f"Connected to MongoDB: {DATABASE_NAME}")
        
        db.users.create_index("email", unique=True)
        db.users.create_index("username", unique=True)
        db.documents.create_index("uploaded_by")
        db.documents.create_index("uploaded_at")
        db.chats.create_index("user_id")
        db.chats.create_index("updated_at")
        db.chat_messages.create_index("chat_id")
        db.chat_messages.create_index("timestamp")
        db.generated_cases.create_index("chat_id")
        db.generated_cases.create_index("document_id")
        db.generated_mcqs.create_index("chat_id")
        db.generated_mcqs.create_index("document_id")
        db.generated_concepts.create_index("chat_id")
        db.generated_concepts.create_index("document_id")
        
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        raise

def get_database():
    return db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    connect_to_mongodb()
    yield
    # Shutdown
    if client:
        client.close()
        print("MongoDB connection closed")

class UserSignup(BaseModel):
    """Schema for user signup"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = Field(None, max_length=100)
    
    @field_validator('password')
    @classmethod
    def validate_password_length(cls, v):
        # Allow longer passwords - we'll truncate them in hash_password function
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        return v

class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    """Schema for Google OAuth authentication"""
    id_token: str

class Token(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str

class UserResponse(BaseModel):
    """User response schema"""
    id: str
    email: str
    username: str
    full_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

class ProfileUpdateRequest(BaseModel):
    """Profile update request schema"""
    first_name: Optional[str] = Field(None, max_length=50)
    last_name: Optional[str] = Field(None, max_length=50)
    full_name: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=50)

class PasswordChangeRequest(BaseModel):
    """Password change request schema"""
    current_password: str
    new_password: str = Field(..., min_length=6)

class ForgotPasswordRequest(BaseModel):
    """Forgot password request schema"""
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    """Reset password request schema"""
    token: str
    new_password: str = Field(..., min_length=8)

class Notification(BaseModel):
    """Notification schema"""
    id: str
    user_id: str
    type: str  # "file_upload", "profile_update", "system", etc.
    title: str
    message: str
    is_read: bool = False
    created_at: datetime
    metadata: Optional[dict] = None

class NotificationResponse(BaseModel):
    """Notification response schema"""
    id: str
    type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime
    metadata: Optional[dict] = None

class DocumentResponse(BaseModel):
    """Document response schema"""
    id: str
    filename: str
    content_type: str
    size: int
    uploaded_by: str
    uploaded_at: datetime
    content: Optional[str] = None

class UserAnalytics(BaseModel):
    """User analytics response schema"""
    name: str
    timeSpent: str
    casesUploaded: int
    mcqAttempted: int
    mostQuestionsType: str
    totalQuestionsCorrect: int
    totalQuestionsAttempted: int
    averageScore: int
    lastActiveDate: str

class CaseGenerationRequest(BaseModel):
    """Case generation request schema"""
    document_id: str
    prompt: str = Field(..., min_length=10, max_length=1000)
    num_scenarios: int = Field(default=3, ge=1, le=10)

class CaseScenario(BaseModel):
    """Case scenario schema"""
    title: str
    description: str
    key_points: List[str]
    difficulty: str

class CaseGenerationResponse(BaseModel):
    """Case generation response schema"""
    document_id: str
    prompt: str
    scenarios: List[CaseScenario]
    generated_at: datetime

class CaseTitleRequest(BaseModel):
    """Case title generation request schema"""
    document_id: str
    num_cases: int = Field(default=5, ge=5, le=10)

class CaseTitle(BaseModel):
    """Case title schema"""
    id: str
    title: str
    description: str
    difficulty: str

class CaseTitlesResponse(BaseModel):
    """Case titles response schema"""
    document_id: str
    cases: List[CaseTitle]
    generated_at: datetime

class MCQRequest(BaseModel):
    """MCQ generation request schema"""
    document_id: Optional[str] = None
    case_id: Optional[str] = None
    case_title: Optional[str] = None
    num_questions: int = Field(default=3, ge=1, le=10)
    include_hints: bool = Field(default=True)

class MCQOption(BaseModel):
    """MCQ option schema"""
    id: str
    text: str
    is_correct: bool

class MCQQuestion(BaseModel):
    """MCQ question schema"""
    id: str
    question: str
    options: List[MCQOption]
    explanation: str
    difficulty: str
    hint: Optional[str] = None

class MCQResponse(BaseModel):
    """MCQ response schema"""
    questions: List[MCQQuestion]
    generated_at: datetime

class ConceptRequest(BaseModel):
    """Concept identification request schema"""
    document_id: str
    num_concepts: int = Field(default=3, ge=1, le=10)

class Concept(BaseModel):
    """Concept schema"""
    id: str
    title: str
    description: str
    importance: str

class ConceptResponse(BaseModel):
    """Concept response schema"""
    document_id: str
    concepts: List[Concept]
    generated_at: datetime

class AutoGenerationRequest(BaseModel):
    """Auto generation request schema"""
    document_id: str
    generate_cases: bool = True
    generate_mcqs: bool = True
    generate_concepts: bool = True
    generate_titles: bool = True
    num_cases: int = Field(default=5, ge=5, le=20)
    num_mcqs: int = Field(default=5, ge=1, le=15)
    num_concepts: int = Field(default=5, ge=1, le=15)
    num_titles: int = Field(default=5, ge=1, le=15)

class AutoGenerationResponse(BaseModel):
    """Auto generation response schema"""
    document_id: str
    cases: Optional[List[CaseScenario]] = None
    mcqs: Optional[List[MCQQuestion]] = None
    concepts: Optional[List[Concept]] = None
    titles: Optional[List[CaseTitle]] = None
    generated_at: datetime
    success: bool
    message: str


def hash_password(password: str) -> str:
    """Hash a password using SHA-256"""
    print(f"HASH_PASSWORD: Hashing password of length: {len(password)}")
    # Add a salt to make it more secure
    salt = "casewise_salt_2024"
    salted_password = password + salt
    hashed = hashlib.sha256(salted_password.encode('utf-8')).hexdigest()
    print(f"HASH_PASSWORD: Hash successful")
    return hashed

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password"""
    print(f"VERIFY_PASSWORD: Verifying password")
    # Hash the plain password and compare
    salt = "casewise_salt_2024"
    salted_password = plain_password + salt
    computed_hash = hashlib.sha256(salted_password.encode('utf-8')).hexdigest()
    is_valid = computed_hash == hashed_password
    print(f"VERIFY_PASSWORD: Password valid: {is_valid}")
    return is_valid

def verify_google_token(id_token_str: str) -> dict:
    """Verify Google ID token and return user info"""
    try:
        print(f"GOOGLE_AUTH: Verifying Google ID token")
        
        if not GOOGLE_CLIENT_ID:
            raise HTTPException(status_code=500, detail="Google OAuth not configured")
        
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            id_token_str, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Verify the issuer
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
        
        print(f"GOOGLE_AUTH: Token verified for user: {idinfo.get('email')}")
        return idinfo
        
    except ValueError as e:
        print(f"GOOGLE_AUTH: Invalid token: {e}")
        raise HTTPException(status_code=401, detail="Invalid Google token")
    except Exception as e:
        print(f"GOOGLE_AUTH: Error verifying token: {e}")
        raise HTTPException(status_code=401, detail="Failed to verify Google token")

def create_notification(user_id: str, notification_type: str, title: str, message: str, metadata: dict = None):
    """Create a notification for a user"""
    try:
        notification_doc = {
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "is_read": False,
            "created_at": datetime.utcnow(),
            "metadata": metadata or {}
        }
        
        result = db.notifications.insert_one(notification_doc)
        print(f" Notification created: {notification_type} for user {user_id}")
        return str(result.inserted_id)
    except Exception as e:
        print(f" Error creating notification: {e}")
        return None

def send_reset_password_email(email: str, reset_token: str, user_name: str = None):
    """Send password reset email to user"""
    try:
        # Email configuration - you should set these in your environment variables
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        
        if not smtp_username or not smtp_password:
            print("❌ SMTP credentials not configured. Please set SMTP_USERNAME and SMTP_PASSWORD environment variables.")
            return False
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = email
        msg['Subject'] = "Password Reset Request - CaseWise"
        
        # Create reset link
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        reset_link = f"{frontend_url}/reset-password?token={reset_token}"
        
        # Email body
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Password Reset Request</h2>
                
                <p>Hello {user_name or 'User'},</p>
                
                <p>We received a request to reset your password for your CaseWise account. If you made this request, click the button below to reset your password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" 
                       style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                        Reset Password
                    </a>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
                    {reset_link}
                </p>
                
                <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
                
                <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="font-size: 12px; color: #6b7280;">
                    This email was sent from CaseWise. If you have any questions, please contact our support team.
                </p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        text = msg.as_string()
        server.sendmail(smtp_username, email, text)
        server.quit()
        
        print(f"✅ Password reset email sent to: {email}")
        return True
        
    except Exception as e:
        print(f"❌ Error sending password reset email: {e}")
        return False

def generate_reset_token():
    """Generate a secure reset token"""
    return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token using simple implementation"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire.timestamp()})
    
    # Simple JWT implementation
    header = {"alg": "HS256", "typ": "JWT"}
    payload = to_encode
    
    # Encode header and payload
    header_encoded = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip('=')
    payload_encoded = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip('=')
    
    # Create signature
    message = f"{header_encoded}.{payload_encoded}"
    signature = hmac.new(
        SECRET_KEY.encode(),
        message.encode(),
        hashlib.sha256
    ).digest()
    signature_encoded = base64.urlsafe_b64encode(signature).decode().rstrip('=')
    
    return f"{header_encoded}.{payload_encoded}.{signature_encoded}"

def decode_jwt_token(token: str) -> dict:
    """Decode JWT token using simple implementation"""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            raise ValueError("Invalid token format")
        
        header_encoded, payload_encoded, signature_encoded = parts
        
        # Decode payload
        payload_padded = payload_encoded + '=' * (4 - len(payload_encoded) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_padded))
        
        # Verify signature
        message = f"{header_encoded}.{payload_encoded}"
        expected_signature = hmac.new(
            SECRET_KEY.encode(),
            message.encode(),
            hashlib.sha256
        ).digest()
        expected_signature_encoded = base64.urlsafe_b64encode(expected_signature).decode().rstrip('=')
        
        if signature_encoded != expected_signature_encoded:
            raise ValueError("Invalid signature")
        
        # Check expiration
        if 'exp' in payload:
            if datetime.utcnow().timestamp() > payload['exp']:
                raise ValueError("Token expired")
        
        return payload
    except Exception as e:
        raise ValueError(f"Token decode error: {str(e)}")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    try:
        print(f"AUTH: Validating token: {credentials.credentials[:20]}...")
        payload = decode_jwt_token(credentials.credentials)
        user_id: str = payload.get("sub")
        print(f"AUTH: Token payload user_id: {user_id}")
        if user_id is None:
            print("ERROR AUTH: No user_id in token payload")
            raise HTTPException(status_code=401, detail="Invalid token")
    except ValueError as e:
        print(f"ERROR AUTH: JWT decode error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        print(f"ERROR AUTH: User not found in database: {user_id}")
        raise HTTPException(status_code=401, detail="User not found")
    
    user["id"] = str(user["_id"])
    print(f"SUCCESS AUTH: User authenticated: {user.get('email', 'No email')}")
    return user

# Rate Limiter Class
class RateLimiter:
    def __init__(self, max_requests: int = 10, time_window: int = 1):
        self.max_requests = max_requests
        self.time_window = time_window
        self.requests = defaultdict(deque)
    
    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        client_requests = self.requests[client_ip]
        
        # Remove old requests outside the time window
        while client_requests and client_requests[0] <= now - self.time_window:
            client_requests.popleft()
        
        # Check if under the limit
        if len(client_requests) < self.max_requests:
            client_requests.append(now)
            return True
        
        return False

# Initialize rate limiter
rate_limiter = RateLimiter(max_requests=10, time_window=1)  # 10 requests per second

def get_rate_limiter():
    return rate_limiter

app = FastAPI(
    title="Medical AI - Auth API",
    description="User authentication using PyMongo",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - temporarily disabled to use custom middleware
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "http://localhost:3000",
#         "http://localhost:3001", 
#         "http://127.0.0.1:3000",
#         "http://127.0.0.1:3001",
#         "http://localhost:8000",
#         "http://127.0.0.1:8000"
#     ],
#     allow_credentials=True,
#     allow_methods=[
#         "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"
#     ],
#     allow_headers=[
#         "Accept",
#         "Accept-Language",
#         "Content-Language",
#         "Content-Type",
#         "Authorization",
#         "X-Requested-With",
#         "Origin",
#         "Access-Control-Request-Method",
#         "Access-Control-Request-Headers",
#         "Cache-Control",
#         "Pragma",
#         "Expires"
#     ],
#     expose_headers=[
#         "Content-Length",
#         "Content-Type",
#         "Date",
#         "Server",
#         "Access-Control-Allow-Origin",
#         "Access-Control-Allow-Credentials"
#     ],
#     max_age=3600
# )

@app.middleware("http")
async def cors_handler(request: Request, call_next):
    # Get the origin from the request
    origin = request.headers.get("origin", "http://localhost:3000")
    print(f"CORS: Request from origin: {origin}")
    print(f"CORS: Request method: {request.method}")
    print(f"CORS: Request URL: {request.url}")
    
    # Handle preflight OPTIONS requests
    if request.method == "OPTIONS":
        print(f"CORS: Handling OPTIONS preflight for origin: {origin}")
        response = Response()
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
        response.headers["Access-Control-Allow-Headers"] = "Accept, Accept-Language, Content-Language, Content-Type, Authorization, X-Requested-With, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, Cache-Control, Pragma, Expires"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Max-Age"] = "3600"
        print(f"CORS: OPTIONS response headers: {dict(response.headers)}")
        return response
    
    # Process the request
    response = await call_next(request)
    
    # Add CORS headers to all responses with specific origin
    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD"
    response.headers["Access-Control-Allow-Headers"] = "Accept, Accept-Language, Content-Language, Content-Type, Authorization, X-Requested-With, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, Cache-Control, Pragma, Expires"
    
    print(f"CORS: Response headers set for origin: {origin}")
    print(f"CORS: Access-Control-Allow-Origin: {response.headers.get('Access-Control-Allow-Origin')}")
    
    return response

@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        # Log the error
        print(f"ERROR: Unhandled exception: {e}")
        import traceback
        traceback.print_exc()
        
        # Return error response with CORS headers
        origin = request.headers.get("origin", "http://localhost:3000")
        response = Response(
            content=f'{{"detail": "Internal server error: {str(e)}"}}',
            status_code=500,
            headers={
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true"
            }
        )
        return response


@app.options("/{path:path}")
async def options_handler(path: str, request: Request):
    """Handle all OPTIONS requests for CORS preflight"""
    origin = request.headers.get("origin", "http://localhost:3000")
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD",
            "Access-Control-Allow-Headers": "Accept, Accept-Language, Content-Language, Content-Type, Authorization, X-Requested-With, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, Cache-Control, Pragma, Expires",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600"
        }
    )

@app.get("/test")
def test_endpoint():
    return {"message": "Test endpoint working", "status": "ok"}

@app.get("/health")
def health_check():
    """Health check endpoint with CORS headers"""
    return {
        "status": "healthy",
        "message": "Backend is running",
        "cors": "enabled",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user_data: UserSignup):
    print("SIGNUP ENDPOINT CALLED")
    print(f"Email: {user_data.email}")
    print(f"Username: {user_data.username}")
    
    try:
        # Check if user already exists
        existing_user = db.users.find_one({
            "$or": [
                {"email": user_data.email}, 
                {"username": user_data.username}
            ]
        })
        
        if existing_user:
            if existing_user.get("email") == user_data.email:
                print(" Email already registered")
                raise HTTPException(status_code=400, detail="Email already registered")
            else:
                print(" Username already taken")
                raise HTTPException(status_code=400, detail="Username already taken")
        
        # Create new user
        print(" Hashing password...")
        hashed_password = hash_password(user_data.password)
        
        user_doc = {
            "email": user_data.email,
            "username": user_data.username,
            "hashed_password": hashed_password,
            "full_name": user_data.full_name,
            "is_active": True,
            "created_at": datetime.utcnow()
        }
        
        print(" Inserting user into database...")
        result = db.users.insert_one(user_doc)
        print(f" User created with ID: {result.inserted_id}")
        
        # Prepare response
        user_doc["id"] = str(result.inserted_id)
        del user_doc["hashed_password"]  
        del user_doc["_id"]  
        
        return user_doc
        
    except HTTPException as he:
        print(f" HTTP Exception: {he.detail}")
        raise
    except Exception as e:
        print(f" Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Signup error: {str(e)}")

@app.post("/login", response_model=Token)
def login(user_credentials: UserLogin):
    print(" LOGIN ENDPOINT CALLED")
    print(f" Email: {user_credentials.email}")
    print(f" Password length: {len(user_credentials.password)}")
    
    try:
        # Check if database is connected
        if db is None:
            print(" Database not connected")
            raise HTTPException(status_code=500, detail="Database connection error")
        
        # Find user by email
        user = db.users.find_one({"email": user_credentials.email})
        print(f" User found: {user is not None}")
        
        if not user:
            print(" User not found")
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        
        print(f" User details: {user.get('username')} - Active: {user.get('is_active', True)}")
        
        # Verify password
        password_valid = verify_password(user_credentials.password, user["hashed_password"])
        print(f" Password verification result: {password_valid}")
        
        if not password_valid:
            print(" Invalid password")
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        
        # Check if user is active
        if not user.get("is_active", True):
            print(" User inactive")
            raise HTTPException(status_code=400, detail="Inactive user")
        
        # Create access token
        access_token = create_access_token(data={"sub": str(user["_id"])})
        print(" Login successful - token created")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(user["_id"]),
            "email": user["email"]
        }
        
    except HTTPException as he:
        print(f" HTTP Exception: {he.detail}")
        raise
    except Exception as e:
        print(f" Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")

@app.post("/auth/google", response_model=Token)
def google_auth(request: GoogleAuthRequest):
    """Authenticate user with Google OAuth"""
    print("GOOGLE_AUTH ENDPOINT CALLED")
    
    try:
        # Verify the Google ID token
        idinfo = verify_google_token(request.id_token)
        
        email = idinfo.get('email')
        name = idinfo.get('name', '')
        picture = idinfo.get('picture', '')
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not provided by Google")
        
        print(f"GOOGLE_AUTH: Processing user: {email}")
        
        # Check if user already exists
        existing_user = db.users.find_one({"email": email})
        
        if existing_user:
            print(f"GOOGLE_AUTH: Existing user found: {email}")
            user = existing_user
        else:
            print(f"GOOGLE_AUTH: Creating new user: {email}")
            # Create new user
            username = email.split('@')[0]  # Use email prefix as username
            
            # Check if username is taken
            counter = 1
            original_username = username
            while db.users.find_one({"username": username}):
                username = f"{original_username}{counter}"
                counter += 1
            
            user_doc = {
                "email": email,
                "username": username,
                "full_name": name,
                "first_name": name.split(' ')[0] if name else '',
                "last_name": ' '.join(name.split(' ')[1:]) if name and len(name.split(' ')) > 1 else '',
                "profile_image_url": picture,
                "is_active": True,
                "created_at": datetime.utcnow(),
                "auth_provider": "google"
            }
            
            result = db.users.insert_one(user_doc)
            user = db.users.find_one({"_id": result.inserted_id})
            print(f"GOOGLE_AUTH: New user created with ID: {result.inserted_id}")
        
        # Create access token
        access_token = create_access_token(data={"sub": str(user["_id"])})
        print("GOOGLE_AUTH: Login successful - token created")
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(user["_id"]),
            "email": user["email"]
        }
        
    except HTTPException as he:
        print(f"GOOGLE_AUTH: HTTP Exception: {he.detail}")
        raise
    except Exception as e:
        print(f"GOOGLE_AUTH: Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Google authentication error: {str(e)}")

@app.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset email to user"""
    print(f"FORGOT_PASSWORD: Request for email: {request.email}")
    
    try:
        # Check if user exists
        user = db.users.find_one({"email": request.email})
        if not user:
            # Don't reveal if email exists or not for security
            return {"message": "If an account with that email exists, we've sent a password reset link."}
        
        # Generate reset token
        reset_token = generate_reset_token()
        expires_at = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
        
        # Store reset token in database
        db.password_reset_tokens.insert_one({
            "user_id": str(user["_id"]),
            "email": request.email,
            "token": reset_token,
            "expires_at": expires_at,
            "used": False,
            "created_at": datetime.utcnow()
        })
        
        # Send email
        user_name = user.get("full_name") or user.get("first_name", "")
        email_sent = send_reset_password_email(request.email, reset_token, user_name)
        
        if email_sent:
            print(f"✅ Password reset email sent to: {request.email}")
            return {"message": "If an account with that email exists, we've sent a password reset link."}
        else:
            print(f"❌ Failed to send password reset email to: {request.email}")
            raise HTTPException(status_code=500, detail="Failed to send password reset email. Please try again later.")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ FORGOT_PASSWORD: Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="An error occurred. Please try again later.")

@app.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset user password using token"""
    print(f"RESET_PASSWORD: Request with token: {request.token[:8]}...")
    
    try:
        # Find valid reset token
        reset_record = db.password_reset_tokens.find_one({
            "token": request.token,
            "used": False,
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if not reset_record:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
        
        # Hash new password
        hashed_password = hashlib.sha256(request.new_password.encode()).hexdigest()
        
        # Update user password
        result = db.users.update_one(
            {"_id": ObjectId(reset_record["user_id"])},
            {
                "$set": {
                    "hashed_password": hashed_password,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="User not found.")
        
        # Mark token as used
        db.password_reset_tokens.update_one(
            {"_id": reset_record["_id"]},
            {"$set": {"used": True, "used_at": datetime.utcnow()}}
        )
        
        print(f"✅ Password reset successful for user: {reset_record['user_id']}")
        return {"message": "Password has been reset successfully. You can now log in with your new password."}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ RESET_PASSWORD: Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="An error occurred. Please try again later.")

@app.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: dict = Depends(get_current_user)):
    user_response = {
        "id": current_user["id"],
        "email": current_user["email"],
        "username": current_user["username"],
        "full_name": current_user.get("full_name"),
        "first_name": current_user.get("first_name"),
        "last_name": current_user.get("last_name"),
        "profile_image_url": current_user.get("profile_image_url"),
        "bio": current_user.get("bio"),
        "created_at": current_user["created_at"],
        "updated_at": current_user.get("updated_at")
    }
    return user_response

@app.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_data: ProfileUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile information"""
    
    print(f" Profile update request for user: {current_user['id']}")
    
    # Check if email is being changed and if it's already taken
    if profile_data.email and profile_data.email != current_user["email"]:
        existing_user = db.users.find_one({"email": profile_data.email})
        if existing_user:
            raise HTTPException(
                status_code=400, 
                detail="Email already exists"
            )
    
    # Check if username is being changed and if it's already taken
    if profile_data.username and profile_data.username != current_user["username"]:
        existing_user = db.users.find_one({"username": profile_data.username})
        if existing_user:
            raise HTTPException(
                status_code=400, 
                detail="Username already exists"
            )
    
    # Prepare update data
    update_data = {}
    
    if profile_data.first_name is not None:
        update_data["first_name"] = profile_data.first_name
    if profile_data.last_name is not None:
        update_data["last_name"] = profile_data.last_name
    if profile_data.full_name is not None:
        update_data["full_name"] = profile_data.full_name
    if profile_data.bio is not None:
        update_data["bio"] = profile_data.bio
    if profile_data.email is not None:
        update_data["email"] = profile_data.email
    if profile_data.username is not None:
        update_data["username"] = profile_data.username
    
    if not update_data:
        raise HTTPException(
            status_code=400, 
            detail="No fields to update"
        )
    
    update_data["updated_at"] = datetime.utcnow()
    
    # Update user in database
    try:
        result = db.users.update_one(
            {"_id": ObjectId(current_user["id"])},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=404, 
                detail="User not found"
            )
        
        print(f" Profile updated successfully for user: {current_user['id']}")
        
        # Create notification for profile update
        create_notification(
            user_id=current_user["id"],
            notification_type="profile_update",
            title="Profile Updated",
            message="Your profile has been successfully updated.",
            metadata={"updated_fields": list(update_data.keys())}
        )
        
        # Fetch updated user data
        updated_user = db.users.find_one({"_id": ObjectId(current_user["id"])})
        
        if not updated_user:
            raise HTTPException(
                status_code=404, 
                detail="User not found after update"
            )
        
        # Prepare response
        user_response = {
            "id": str(updated_user["_id"]),
            "email": updated_user["email"],
            "username": updated_user["username"],
            "full_name": updated_user.get("full_name"),
            "first_name": updated_user.get("first_name"),
            "last_name": updated_user.get("last_name"),
            "profile_image_url": updated_user.get("profile_image_url"),
            "bio": updated_user.get("bio"),
            "created_at": updated_user["created_at"],
            "updated_at": updated_user.get("updated_at")
        }
        
        return user_response
        
    except Exception as e:
        print(f" Error updating profile: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to update profile"
        )

@app.put("/profile/password")
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Change user password"""
    
    print(f" Password change request for user: {current_user['id']}")
    
    # Verify current password
    user = db.users.find_one({"_id": ObjectId(current_user["id"])})
    if not user:
        raise HTTPException(
            status_code=404, 
            detail="User not found"
        )
    
    # Verify current password
    if not verify_password(password_data.current_password, user["hashed_password"]):
        raise HTTPException(
            status_code=400, 
            detail="Current password is incorrect"
        )
    
    # Hash new password
    new_hashed_password = hash_password(password_data.new_password)
    
    # Update password in database
    try:
        result = db.users.update_one(
            {"_id": ObjectId(current_user["id"])},
            {
                "$set": {
                    "hashed_password": new_hashed_password,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=404, 
                detail="User not found"
            )
        
        print(f" Password updated successfully for user: {current_user['id']}")
        
        return {"message": "Password updated successfully"}
        
    except Exception as e:
        print(f" Error updating password: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to update password"
        )

@app.post("/profile/upload-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload profile image"""
    
    print(f" Profile image upload for user: {current_user['id']}")
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400, 
            detail="File must be an image"
        )
    
    # Validate file size (2MB limit)
    max_size = 2 * 1024 * 1024  # 2MB
    if file.size and file.size > max_size:
        raise HTTPException(
            status_code=400, 
            detail="File size must be less than 2MB"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # For now, we'll store the image as base64 in the database
        # In production, you'd want to use a cloud storage service like AWS S3
        import base64
        image_base64 = base64.b64encode(content).decode('utf-8')
        image_url = f"data:{file.content_type};base64,{image_base64}"
        
        # Update user profile with image URL
        result = db.users.update_one(
            {"_id": ObjectId(current_user["id"])},
            {
                "$set": {
                    "profile_image_url": image_url,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=404, 
                detail="User not found"
            )
        
        print(f" Profile image uploaded successfully for user: {current_user['id']}")
        
        # Create notification for profile image upload
        create_notification(
            user_id=current_user["id"],
            notification_type="profile_update",
            title="Profile Image Updated",
            message="Your profile image has been successfully updated.",
            metadata={"file_size": len(content), "content_type": file.content_type}
        )
        
        return {
            "message": "Profile image uploaded successfully",
            "image_url": image_url
        }
        
    except Exception as e:
        print(f" Error uploading profile image: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to upload profile image"
        )

# Notification endpoints
@app.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(
    current_user: dict = Depends(get_current_user),
    limit: int = 50,
    unread_only: bool = False
):
    """Get user notifications"""
    
    print(f" Getting notifications for user: {current_user['id']}")
    
    try:
        query = {"user_id": current_user["id"]}
        if unread_only:
            query["is_read"] = False
        
        notifications = list(db.notifications.find(query)
                           .sort("created_at", -1)
                           .limit(limit))
        
        notification_list = []
        for notification in notifications:
            # Convert MongoDB datetime to ISO string
            created_at = notification["created_at"]
            if hasattr(created_at, 'isoformat'):
                created_at_str = created_at.isoformat()
            else:
                created_at_str = str(created_at)
            
            notification_list.append({
                "id": str(notification["_id"]),
                "type": notification["type"],
                "title": notification["title"],
                "message": notification["message"],
                "is_read": notification["is_read"],
                "created_at": created_at_str,
                "metadata": notification.get("metadata")
            })
        
        print(f" Found {len(notification_list)} notifications")
        return notification_list
        
    except Exception as e:
        print(f" Error getting notifications: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to get notifications"
        )

@app.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a notification as read"""
    
    print(f" Marking notification {notification_id} as read for user: {current_user['id']}")
    
    try:
        result = db.notifications.update_one(
            {
                "_id": ObjectId(notification_id),
                "user_id": current_user["id"]
            },
            {"$set": {"is_read": True}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=404, 
                detail="Notification not found"
            )
        
        print(f" Notification {notification_id} marked as read")
        return {"message": "Notification marked as read"}
        
    except Exception as e:
        print(f" Error marking notification as read: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to mark notification as read"
        )

@app.put("/notifications/read-all")
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user)
):
    """Mark all notifications as read for the current user"""
    
    print(f" Marking all notifications as read for user: {current_user['id']}")
    
    try:
        result = db.notifications.update_many(
            {
                "user_id": current_user["id"],
                "is_read": False
            },
            {"$set": {"is_read": True}}
        )
        
        print(f" Marked {result.modified_count} notifications as read")
        return {"message": f"Marked {result.modified_count} notifications as read"}
        
    except Exception as e:
        print(f" Error marking all notifications as read: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to mark all notifications as read"
        )

@app.get("/notifications/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user)
):
    """Get count of unread notifications"""
    
    try:
        count = db.notifications.count_documents({
            "user_id": current_user["id"],
            "is_read": False
        })
        
        return {"unread_count": count}
        
    except Exception as e:
        print(f" Error getting unread count: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to get unread count"
        )

@app.get("/analytics/user", response_model=UserAnalytics)
async def get_user_analytics(current_user: dict = Depends(get_current_user)):
    """Get user analytics and statistics"""
    
    try:
        user_id = current_user["id"]
        
        # Get user info
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Calculate statistics
        # Count documents uploaded by user
        cases_uploaded = db.documents.count_documents({"uploaded_by": user_id})
        
        # Get MCQ statistics from user document
        mcq_attempted = user.get("mcq_attempted", 0)
        total_questions_correct = user.get("total_questions_correct", 0)
        total_questions_attempted = user.get("total_questions_attempted", 0)
        
        # Get chat sessions to calculate time spent (optimized)
        chat_count = db.chats.count_documents({"user_id": user_id})
        
        # Calculate time spent (simplified - could be more sophisticated)
        time_spent_minutes = chat_count * 5  # Assume 5 minutes per chat session
        if time_spent_minutes < 60:
            time_spent = f"{time_spent_minutes} mins"
        else:
            hours = time_spent_minutes // 60
            minutes = time_spent_minutes % 60
            time_spent = f"{hours}h {minutes}m"
        
        # Determine most common question type (placeholder)
        most_questions_type = "Easy"  # This would be calculated from actual data
        
        # Calculate average score
        average_score = 0
        if total_questions_attempted > 0:
            average_score = int((total_questions_correct / total_questions_attempted) * 100)
        
        # Get last active date
        last_active_date = user.get("updated_at", user.get("created_at", datetime.now()))
        if isinstance(last_active_date, datetime):
            last_active_date = last_active_date.strftime("%Y-%m-%d")
        else:
            last_active_date = datetime.now().strftime("%Y-%m-%d")
        
        # Build response
        analytics = UserAnalytics(
            name=user.get("full_name", user.get("username", "User")),
            timeSpent=time_spent,
            casesUploaded=cases_uploaded,
            mcqAttempted=mcq_attempted,
            mostQuestionsType=most_questions_type,
            totalQuestionsCorrect=total_questions_correct,
            totalQuestionsAttempted=total_questions_attempted,
            averageScore=average_score,
            lastActiveDate=last_active_date
        )
        
        return analytics
        
    except Exception as e:
        print(f"Error getting user analytics: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to get user analytics"
        )

class MCQCompletionRequest(BaseModel):
    """MCQ completion request schema"""
    correct_answers: int
    total_questions: int
    case_id: Optional[str] = None

@app.post("/analytics/mcq-completion")
async def update_mcq_analytics(
    request: MCQCompletionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update user analytics after MCQ completion"""
    
    print(f"🔄 MCQ Analytics Update Request:")
    print(f"   User ID: {current_user.get('id', 'N/A')}")
    print(f"   Correct Answers: {request.correct_answers}")
    print(f"   Total Questions: {request.total_questions}")
    print(f"   Case ID: {request.case_id}")
    
    try:
        user_id = current_user["id"]
        
        # Get user info
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update user's MCQ statistics
        # For now, we'll store this in the user document
        # In a real app, you might want a separate analytics collection
        
        current_mcq_attempted = user.get("mcq_attempted", 0)
        current_correct = user.get("total_questions_correct", 0)
        current_attempted = user.get("total_questions_attempted", 0)
        
        # Update the statistics
        # mcq_attempted should count total questions attempted, not cases
        new_mcq_attempted = current_mcq_attempted + request.total_questions
        new_correct = current_correct + request.correct_answers
        new_attempted = current_attempted + request.total_questions
        
        # Calculate new average score
        new_average_score = int((new_correct / new_attempted) * 100) if new_attempted > 0 else 0
        
        # Update user document
        update_result = db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "mcq_attempted": new_mcq_attempted,
                    "total_questions_correct": new_correct,
                    "total_questions_attempted": new_attempted,
                    "average_score": new_average_score,
                    "updated_at": datetime.now()
                }
            }
        )
        
        print(f"📊 Database update result: {update_result.modified_count} documents modified")
        print(f"📊 New stats: MCQ={new_mcq_attempted}, Correct={new_correct}, Total={new_attempted}, Avg={new_average_score}%")
        
        return {
            "message": "Analytics updated successfully",
            "updated_stats": {
                "mcq_attempted": new_mcq_attempted,
                "total_questions_correct": new_correct,
                "total_questions_attempted": new_attempted,
                "average_score": new_average_score
            }
        }
        
    except Exception as e:
        print(f"Error updating MCQ analytics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to update analytics"
        )

@app.post("/analytics/clear")
async def clear_user_analytics(current_user: dict = Depends(get_current_user)):
    """Clear analytics data for the current user"""
    
    try:
        user_id = current_user["id"]
        
        # Clear analytics fields for the user
        result = db.users.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$unset": {
                    "mcq_attempted": "",
                    "total_questions_correct": "",
                    "total_questions_attempted": "",
                    "average_score": ""
                }
            }
        )
        
        if result.modified_count > 0:
            return {"message": "Analytics data cleared successfully"}
        else:
            return {"message": "No analytics data found to clear"}
        
    except Exception as e:
        print(f"Error clearing analytics: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to clear analytics"
        )

@app.post("/documents/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a document and store it in MongoDB with enhanced processing"""
    
    print(f" Document upload started: {file.filename} ({file.content_type})")
    
    # Validate file size (20MB limit)
    max_size = 20 * 1024 * 1024  # 20MB
    if file.size and file.size > max_size:
        raise HTTPException(
            status_code=400, 
            detail=f"File size ({file.size} bytes) exceeds 20MB limit"
        )
    
    # Validate file type
    allowed_types = [
        "text/plain", "application/pdf", "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/markdown"
    ]
    
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"File type {file.content_type} not supported. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Read file content
    try:
        content = await file.read()
        content_str = None
        
        if file.content_type in ["text/plain", "text/markdown"]:
            content_str = content.decode('utf-8')
            print(f" Text file processed: {len(content_str)} characters")
        elif file.content_type == "application/pdf":
            if PDF_AVAILABLE and PDF_LIBRARY:
                # Extract actual content from PDF using available library
                try:
                    if PDF_LIBRARY == "pypdf":
                        import pypdf
                        pdf_reader = pypdf.PdfReader(io.BytesIO(content))
                    else:  # PyPDF2
                        import PyPDF2
                        pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
                    
                    content_str = ""
                    
                    for page_num, page in enumerate(pdf_reader.pages):
                        page_text = page.extract_text()
                        if page_text.strip():
                            content_str += f"\n--- Page {page_num + 1} ---\n"
                            content_str += page_text
                    
                    if not content_str.strip():
                        # Fallback if no text could be extracted
                        content_str = f"PDF file: {file.filename}\n\nNote: This PDF file could not be processed for text extraction. Please ensure the PDF contains selectable text."
                    
                    print(f" PDF processed with {PDF_LIBRARY}: {len(content_str)} characters extracted from {len(pdf_reader.pages)} pages")
                    
                except Exception as e:
                    print(f" PDF processing error with {PDF_LIBRARY}: {e}")
                    content_str = f"PDF file: {file.filename}\n\nError: Could not extract text from PDF using {PDF_LIBRARY}. Please ensure the file is not corrupted and contains selectable text."
            else:
                # Fallback content when no PDF library is available - provide sample medical content for testing
                content_str = f"""Medical Case Study - {file.filename}

PATIENT INFORMATION:
Name: Ramesh Kumar
Age: 45 years
Gender: Male
Chief Complaint: Chest pain and shortness of breath

HISTORY OF PRESENT ILLNESS:
Patient presents with acute onset chest pain that started 2 hours ago. The pain is described as crushing, substernal, and radiating to the left arm. Associated symptoms include diaphoresis, nausea, and shortness of breath. Patient has a history of hypertension and diabetes mellitus type 2.

PHYSICAL EXAMINATION:
Vital Signs: BP 160/95 mmHg, HR 110 bpm, RR 24/min, Temp 98.6°F, O2 Sat 92% on room air
Cardiovascular: Regular rhythm, no murmurs, JVD not elevated
Respiratory: Bilateral rales in lower lung fields
Abdomen: Soft, non-tender, no organomegaly

DIAGNOSTIC WORKUP:
ECG: ST elevation in leads II, III, aVF (inferior STEMI)
Troponin I: 15.2 ng/mL (elevated)
CK-MB: 45 U/L (elevated)
Chest X-ray: Mild pulmonary edema

ASSESSMENT AND PLAN:
1. Acute ST-elevation myocardial infarction (STEMI) - inferior wall
2. Hypertension
3. Diabetes mellitus type 2

Treatment plan includes:
- Immediate cardiac catheterization for primary PCI
- Dual antiplatelet therapy (aspirin + clopidogrel)
- Beta-blocker (metoprolol)
- ACE inhibitor (lisinopril)
- Statin therapy (atorvastatin)
- Blood glucose monitoring and insulin management

PROGNOSIS:
Patient requires immediate intervention. Door-to-balloon time should be less than 90 minutes for optimal outcomes.

Note: This is sample medical content for testing purposes. In a real scenario, this would be extracted from the actual PDF document."""
                print(f" PDF file processed with enhanced fallback content: {len(content_str)} characters")
        elif file.content_type in ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
            # Process Word documents (DOC and DOCX)
            try:
                if file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                    # DOCX file processing
                    import docx
                    doc = docx.Document(io.BytesIO(content))
                    content_str = ""
                    
                    for paragraph in doc.paragraphs:
                        if paragraph.text.strip():
                            content_str += paragraph.text + "\n"
                    
                    # Also extract text from tables
                    for table in doc.tables:
                        for row in table.rows:
                            for cell in row.cells:
                                if cell.text.strip():
                                    content_str += cell.text + " "
                            content_str += "\n"
                    
                    if not content_str.strip():
                        content_str = f"DOCX file: {file.filename}\n\nNote: This DOCX file could not be processed for text extraction. Please ensure the document contains readable text."
                    
                    print(f" DOCX processed: {len(content_str)} characters extracted")
                    
                elif file.content_type == "application/msword":
                    # DOC file processing using docx2txt
                    import docx2txt
                    content_str = docx2txt.process(io.BytesIO(content))
                    
                    if not content_str.strip():
                        content_str = f"DOC file: {file.filename}\n\nNote: This DOC file could not be processed for text extraction. Please ensure the document contains readable text."
                    
                    print(f" DOC processed: {len(content_str)} characters extracted")
                    
            except ImportError as e:
                print(f" Missing library for Word document processing: {e}")
                content_str = f"Word document: {file.filename}\n\nError: Required libraries for Word document processing are not installed. Please install python-docx and docx2txt."
            except Exception as e:
                print(f" Error processing Word document: {e}")
                content_str = f"Word document: {file.filename}\n\nError: Could not extract text from Word document. Please ensure the file is not corrupted and contains readable text."
        else:
            content_str = f"Document: {file.filename}. Content type: {file.content_type}. Please use text files for full functionality."
            print(f" Unsupported file type processed with placeholder content")
            
    except Exception as e:
        print(f" Error reading file: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")
    
    # Create document record
    document_doc = {
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "content": content_str,
        "uploaded_by": current_user["id"],
        "uploaded_at": datetime.utcnow(),
        "processing_status": "completed"
    }
    
    # Store in MongoDB
    result = db.documents.insert_one(document_doc)
    document_id = str(result.inserted_id)
    
    print(f" Document stored successfully with ID: {document_id}")
    
    # Return response
    document_doc["id"] = document_id
    del document_doc["_id"]
    
    return document_doc

@app.post("/documents/upload-enhanced", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document_enhanced(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a document with enhanced PDF extraction and automatic case/MCQ detection"""
    
    print(f" Enhanced document upload started: {file.filename} ({file.content_type})")
    
    # Validate file size (20MB limit)
    max_size = 20 * 1024 * 1024
    if file.size and file.size > max_size:
        raise HTTPException(
            status_code=400, 
            detail=f"File size ({file.size} bytes) exceeds 20MB limit"
        )
    
    # Validate file type
    allowed_types = [
        "text/plain", "application/pdf", "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/markdown"
    ]
    
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail=f"File type {file.content_type} not supported"
        )
    
    # Read file content
    try:
        content = await file.read()
        content_str = None
        extraction_metadata = {}
        
        if file.content_type in ["text/plain", "text/markdown"]:
            content_str = content.decode('utf-8')
            print(f" Text file processed: {len(content_str)} characters")
            
        elif file.content_type == "application/pdf":
            if PDF_AVAILABLE and PDF_LIBRARY == "pypdf":
                try:
                    extractor = PDFContentExtractor()
                    result = extractor.extract_text_from_pdf(content)
                    
                    content_str = result["full_text"]
                    
                    # Store extraction metadata
                    extraction_metadata = {
                        "total_pages": result["total_pages"],
                        "has_cases": result["has_cases"],
                        "has_mcqs": result["has_mcqs"],
                        "detected_cases_count": len(result["detected_cases"]),
                        "detected_mcqs_count": len(result["detected_mcqs"]),
                        "detected_cases": result["detected_cases"],
                        "detected_mcqs": result["detected_mcqs"]
                    }
                    
                    print(f" Enhanced PDF processing:")
                    print(f"   - Pages: {result['total_pages']}")
                    print(f"   - Cases detected: {len(result['detected_cases'])}")
                    print(f"   - MCQs detected: {len(result['detected_mcqs'])}")
                    print(f"   - Characters extracted: {len(content_str)}")
                    
                except Exception as e:
                    print(f" Enhanced PDF processing error: {e}")
                    # Fallback to basic extraction
                    pdf_reader = pypdf.PdfReader(io.BytesIO(content))
                    content_str = ""
                    for page_num, page in enumerate(pdf_reader.pages):
                        page_text = page.extract_text()
                        if page_text.strip():
                            content_str += f"\n--- Page {page_num + 1} ---\n"
                            content_str += page_text
            else:
                # Fallback content
                content_str = f"PDF file: {file.filename}\n\nPDF processing library not available."
                
        elif file.content_type in ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
            # Process Word documents (DOC and DOCX) with enhanced processing
            try:
                if file.content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                    # DOCX file processing
                    import docx
                    doc = docx.Document(io.BytesIO(content))
                    content_str = ""
                    
                    for paragraph in doc.paragraphs:
                        if paragraph.text.strip():
                            content_str += paragraph.text + "\n"
                    
                    # Also extract text from tables
                    for table in doc.tables:
                        for row in table.rows:
                            for cell in row.cells:
                                if cell.text.strip():
                                    content_str += cell.text + " "
                            content_str += "\n"
                    
                    if not content_str.strip():
                        content_str = f"DOCX file: {file.filename}\n\nNote: This DOCX file could not be processed for text extraction. Please ensure the document contains readable text."
                    
                    print(f" Enhanced DOCX processed: {len(content_str)} characters extracted")
                    
                elif file.content_type == "application/msword":
                    # DOC file processing using python-docx2txt
                    import docx2txt
                    content_str = docx2txt.process(io.BytesIO(content))
                    
                    if not content_str.strip():
                        content_str = f"DOC file: {file.filename}\n\nNote: This DOC file could not be processed for text extraction. Please ensure the document contains readable text."
                    
                    print(f" Enhanced DOC processed: {len(content_str)} characters extracted")
                    
                # For Word documents, we can also try to detect cases and MCQs
                if content_str and len(content_str) > 100:  # Only if we have substantial content
                    # Simple case detection for Word documents
                    case_indicators = ["case study", "patient", "diagnosis", "treatment", "symptoms", "medical history"]
                    mcq_indicators = ["question", "answer", "option", "a)", "b)", "c)", "d)", "multiple choice"]
                    
                    has_cases = any(indicator.lower() in content_str.lower() for indicator in case_indicators)
                    has_mcqs = any(indicator.lower() in content_str.lower() for indicator in mcq_indicators)
                    
                    extraction_metadata = {
                        "has_cases": has_cases,
                        "has_mcqs": has_mcqs,
                        "detected_cases_count": 1 if has_cases else 0,
                        "detected_mcqs_count": 1 if has_mcqs else 0,
                        "word_document_processed": True
                    }
                    
                    print(f" Enhanced Word document analysis:")
                    print(f"   - Cases detected: {has_cases}")
                    print(f"   - MCQs detected: {has_mcqs}")
                    print(f"   - Characters extracted: {len(content_str)}")
                    
            except ImportError as e:
                print(f" Missing library for Word document processing: {e}")
                content_str = f"Word document: {file.filename}\n\nError: Required libraries for Word document processing are not installed. Please install python-docx and docx2txt."
            except Exception as e:
                print(f" Error processing Word document: {e}")
                content_str = f"Word document: {file.filename}\n\nError: Could not extract text from Word document. Please ensure the file is not corrupted and contains readable text."
                
    except Exception as e:
        print(f" Error reading file: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")
    
    # Create document record
    document_doc = {
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "content": content_str,
        "uploaded_by": current_user["id"],
        "uploaded_at": datetime.utcnow(),
        "processing_status": "completed",
        "extraction_metadata": extraction_metadata
    }
    
    # Store in MongoDB
    result = db.documents.insert_one(document_doc)
    document_id = str(result.inserted_id)
    
    print(f" Enhanced document stored successfully with ID: {document_id}")
    
    # Create notification for file upload
    create_notification(
        user_id=current_user["id"],
        notification_type="file_upload",
        title="Document Uploaded",
        message=f"Your document '{file.filename}' has been successfully uploaded and processed.",
        metadata={
            "document_id": document_id,
            "filename": file.filename,
            "file_size": len(content),
            "content_type": file.content_type,
            "extraction_metadata": extraction_metadata
        }
    )
    
    # Return response
    document_doc["id"] = document_id
    del document_doc["_id"]
    
    return document_doc

@app.get("/documents/{document_id}/extracted-content")
async def get_extracted_content(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get extracted cases and MCQs from a document"""
    
    try:
        document = db.documents.find_one({
            "_id": ObjectId(document_id),
            "uploaded_by": current_user["id"]
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    extraction_metadata = document.get("extraction_metadata", {})
    
    return {
        "document_id": document_id,
        "filename": document.get("filename"),
        "has_cases": extraction_metadata.get("has_cases", False),
        "has_mcqs": extraction_metadata.get("has_mcqs", False),
        "detected_cases": extraction_metadata.get("detected_cases", []),
        "detected_mcqs": extraction_metadata.get("detected_mcqs", []),
        "total_cases": extraction_metadata.get("detected_cases_count", 0),
        "total_mcqs": extraction_metadata.get("detected_mcqs_count", 0)
    }

@app.get("/test-gemini")
async def test_gemini():
    """Test Gemini API and list available models"""
    try:
        import google.generativeai as genai
        
        # List all available models
        available_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                available_models.append(m.name)
        
        return {
            "api_key_configured": bool(GEMINI_API_KEY),
            "api_key_prefix": GEMINI_API_KEY[:10] if GEMINI_API_KEY else None,
            "available_models": available_models
        }
    except Exception as e:
        return {
            "error": str(e),
            "error_type": type(e).__name__
        }

@app.post("/ai/generate-cases", response_model=CaseGenerationResponse)
async def generate_case_scenarios(
    request: CaseGenerationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate case scenarios from a document using Gemini AI"""
    
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini AI API key not configured")
    
    # Find the document
    try:
        document = db.documents.find_one({
            "_id": ObjectId(request.document_id),
            "uploaded_by": current_user["id"]
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found or access denied")
    
    # Check if document has text content
    if not document.get("content"):
        raise HTTPException(status_code=400, detail="Document does not contain readable text content")
    
    try:
        # Initialize Gemini model - try different model names
        model = None
        model_names = [
            'models/gemini-2.5-flash'
        ]
        
        for model_name in model_names:
            try:
                model = genai.GenerativeModel(model_name)
                print(f"SUCCESS: Using {model_name} for case generation")
                break
            except Exception as e:
                print(f"WARNING: {model_name} failed: {e}")
                continue
        
        if not model:
            raise Exception("No working Gemini model found")
        
        # Create the prompt for case generation
        system_prompt = f"""
        You are an expert medical case scenario generator specializing in creating comprehensive, educational medical cases for medical students. Based on the following document content and user prompt, generate {request.num_scenarios} realistic, detailed medical case scenarios.

        Document Content:
        {document['content'][:4000]}  # Limit content to avoid token limits

        User Prompt: {request.prompt}

        IMPORTANT INSTRUCTIONS:
        - Create realistic, clinically relevant cases
        - Include detailed patient presentations with specific symptoms, vital signs, and history
        - Provide comprehensive case descriptions (minimum 2-3 paragraphs each)
        - Include specific learning objectives and clinical reasoning points
        - Make cases challenging but educational
        - Include relevant diagnostic considerations and treatment approaches

        For each scenario, provide:
        1. A clear, descriptive title that indicates the main condition
        2. A detailed, comprehensive case description including:
           - Patient demographics and presenting complaint
           - Detailed history of present illness
           - Relevant past medical history
           - Physical examination findings
           - Initial diagnostic considerations
        3. 5-7 specific key learning points covering:
           - Pathophysiology
           - Diagnostic criteria
           - Differential diagnosis
           - Treatment options
           - Clinical pearls
        4. Appropriate difficulty level (Beginner, Intermediate, Advanced)

        Format your response as a JSON array with the following structure:
        [
            {{
                "title": "Specific Case Title (e.g., 'Acute Myocardial Infarction in a 55-year-old Male')",
                "description": "Comprehensive case description with detailed patient presentation, history, examination findings, and clinical context...",
                "key_points": ["Specific learning point 1", "Specific learning point 2", "Specific learning point 3", "Specific learning point 4", "Specific learning point 5"],
                "difficulty": "Easy/Moderate/Hard"
            }}
        ]
        """
        
        # Generate response from Gemini
        response = model.generate_content(system_prompt)
        
        # Parse the response (assuming it returns JSON)
        import json
        try:
            scenarios_data = json.loads(response.text)
        except json.JSONDecodeError:
            # If JSON parsing fails, create a fallback response
            scenarios_data = [{
                "title": f"Generated Case {i+1}",
                "description": f"Case scenario based on: {request.prompt}",
                "key_points": ["Key learning point 1", "Key learning point 2", "Key learning point 3"],
                "difficulty": "Moderate"
            } for i in range(request.num_scenarios)]
        
        # Convert to CaseScenario objects
        scenarios = [CaseScenario(**scenario) for scenario in scenarios_data[:request.num_scenarios]]
        
        return CaseGenerationResponse(
            document_id=request.document_id,
            prompt=request.prompt,
            scenarios=scenarios,
            generated_at=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating cases: {str(e)}")

@app.post("/ai/generate-case-titles", response_model=CaseTitlesResponse)
async def generate_case_titles(
    request: CaseTitleRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate case titles from a document using Gemini AI"""
    
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini AI API key not configured")
    
    # Find the document
    try:
        document = db.documents.find_one({
            "_id": ObjectId(request.document_id),
            "uploaded_by": current_user["id"]
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found or access denied")
    
    # Check if document has text content
    if not document.get("content"):
        raise HTTPException(status_code=400, detail="Document does not contain readable text content")
    
    try:
        # Initialize Gemini model
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        # Create the prompt for case title generation
        system_prompt = f"""
        You are an expert medical case generator. Based on the following document content, generate {request.num_cases} realistic medical case titles with brief descriptions.

        Document Content:
        {document['content'][:3000]}

        IMPORTANT INSTRUCTIONS:
        - Create realistic, clinically relevant case titles
        - Each case should have a clear, descriptive title (1-2 lines)
        - Include a brief description (1-2 sentences) for each case
        - Assign appropriate difficulty levels (Easy, Moderate, Hard)
        - Make cases diverse and educational
        - Focus on different aspects of the medical content

        CRITICAL: You must respond with ONLY a valid JSON array. Do not include any markdown formatting, explanations, or additional text. Start your response directly with [ and end with ].

        Format your response as a JSON array with the following structure:
        [
            {{
                "id": "case_1",
                "title": "Specific Case Title (e.g., 'Acute Myocardial Infarction in a 55-year-old Male')",
                "description": "Brief 1-2 sentence description of the case scenario and key learning points.",
                "difficulty": "Easy/Moderate/Hard"
            }}
        ]
        """
        
        # Generate response from Gemini
        response = model.generate_content(system_prompt)
        
        # Parse the response
        import json
        print(f"AI Raw Gemini response: {response.text}")
        
        try:
            # Try to extract JSON from the response if it's wrapped in markdown
            response_text = response.text.strip()
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            elif response_text.startswith('```'):
                response_text = response_text.replace('```', '').strip()
            
            cases_data = json.loads(response_text)
            print(f"SUCCESS: Successfully parsed JSON: {len(cases_data)} cases")
        except json.JSONDecodeError as e:
            print(f"ERROR: JSON parsing failed: {e}")
            print(f"Response text: {response.text[:500]}...")
            # If JSON parsing fails, create a fallback response based on document content
            cases_data = [{
                "id": f"case_{i+1}",
                "title": f"Case {i+1} from {document.get('filename', 'Document')}",
                "description": f"Medical case scenario based on the uploaded document content.",
                "difficulty": "Moderate"
            } for i in range(request.num_cases)]
        
        # Convert to CaseTitle objects
        cases = [CaseTitle(**case) for case in cases_data[:request.num_cases]]
        
        return CaseTitlesResponse(
            document_id=request.document_id,
            cases=cases,
            generated_at=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating case titles: {str(e)}")

@app.post("/ai/generate-mcqs", response_model=MCQResponse)
async def generate_mcqs(
    request: MCQRequest,
    current_user: dict = Depends(get_current_user)
):
    """Generate MCQ questions from a document or case using Gemini AI"""
    
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini AI API key not configured")
    
    document_context = ""
    
    # Get document context if document_id is provided
    if request.document_id:
        try:
            document = db.documents.find_one({
                "_id": ObjectId(request.document_id),
                "uploaded_by": current_user["id"]
            })
            if document and document.get("content"):
                document_context = document['content'][:3000]
        except Exception:
            pass
    
    if not document_context:
        raise HTTPException(status_code=400, detail="No document content available for MCQ generation")
    
    try:
        # Initialize Gemini model
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        # Create the prompt for MCQ generation
        case_context = ""
        if request.case_title:
            case_context = f"\n\nSpecific Case Focus: {request.case_title}\nGenerate MCQs specifically related to this case scenario."
        
        # Build hint instruction based on request
        hint_instruction = ""
        hint_field = ""
        if request.include_hints:
            hint_instruction = "\n        - Include helpful hints that guide students toward the correct answer without giving it away"
            hint_field = ',\n                "hint": "Helpful hint that guides toward the correct answer without revealing it"'
        
        system_prompt = f"""
        You are an expert medical educator creating MCQ questions. Based on the following content, generate {request.num_questions} high-quality multiple-choice questions.{case_context}

        Content:
        {document_context}

        IMPORTANT INSTRUCTIONS:
        - Create clinically relevant, educational MCQ questions
        - Each question should have exactly 5 answer options (A, B, C, D, E)
        - Only ONE option should be correct
        - Include detailed explanations for the correct answer
        - Assign appropriate difficulty levels (Easy, Moderate, Hard)
        - Focus on key medical concepts, diagnosis, treatment, and pathophysiology
        - Make distractors plausible but clearly incorrect{hint_instruction}

        CRITICAL: You must respond with ONLY a valid JSON array. Do not include any markdown formatting, explanations, or additional text. Start your response directly with [ and end with ].

        Format your response as a JSON array with the following structure:
        [
            {{
                "id": "mcq_1",
                "question": "Clear, specific question text ending with a question mark?",
                "options": [
                    {{"id": "A", "text": "Option A text", "is_correct": false}},
                    {{"id": "B", "text": "Option B text", "is_correct": true}},
                    {{"id": "C", "text": "Option C text", "is_correct": false}},
                    {{"id": "D", "text": "Option D text", "is_correct": false}},
                    {{"id": "E", "text": "Option E text", "is_correct": false}}
                ],
                "explanation": "Detailed explanation of why the correct answer is correct and why others are wrong.",
                "difficulty": "Easy/Moderate/Hard"{hint_field}
            }}
        ]
        """
        
        # Generate response from Gemini
        response = model.generate_content(system_prompt)
        
        # Parse the response
        import json
        print(f"AI Raw MCQ Gemini response: {response.text}")
        
        try:
            # Try to extract JSON from the response if it's wrapped in markdown
            response_text = response.text.strip()
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            elif response_text.startswith('```'):
                response_text = response_text.replace('```', '').strip()
            
            mcqs_data = json.loads(response_text)
            print(f"SUCCESS: Successfully parsed MCQ JSON: {len(mcqs_data)} questions")
        except json.JSONDecodeError as e:
            print(f"ERROR: MCQ JSON parsing failed: {e}")
            print(f"Response text: {response.text[:500]}...")
            # If JSON parsing fails, create a fallback response
            mcqs_data = [{
                "id": f"mcq_{i+1}",
                "question": f"Question {i+1} based on document content?",
                "options": [
                    {"id": "A", "text": "Option A", "is_correct": False},
                    {"id": "B", "text": "Option B", "is_correct": True},
                    {"id": "C", "text": "Option C", "is_correct": False},
                    {"id": "D", "text": "Option D", "is_correct": False},
                    {"id": "E", "text": "Option E", "is_correct": False}
                ],
                "explanation": "This is based on the document content.",
                "difficulty": "Moderate"
            } for i in range(request.num_questions)]
        
        # Convert to MCQQuestion objects
        questions = []
        for mcq_data in mcqs_data[:request.num_questions]:
            options = [MCQOption(**option) for option in mcq_data["options"]]
            question = MCQQuestion(
                id=mcq_data["id"],
                question=mcq_data["question"],
                options=options,
                explanation=mcq_data["explanation"],
                difficulty=mcq_data["difficulty"]
            )
            questions.append(question)
        
        return MCQResponse(
            questions=questions,
            generated_at=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating MCQs: {str(e)}")

@app.post("/ai/identify-concepts", response_model=ConceptResponse)
async def identify_concepts(
    request: ConceptRequest,
    current_user: dict = Depends(get_current_user)
):
    """Identify key medical concepts from a document using Gemini AI"""
    
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini AI API key not configured")
    
    # Find the document
    try:
        document = db.documents.find_one({
            "_id": ObjectId(request.document_id),
            "uploaded_by": current_user["id"]
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found or access denied")
    
    # Check if document has text content
    if not document.get("content"):
        raise HTTPException(status_code=400, detail="Document does not contain readable text content")
    
    try:
        # Initialize Gemini model
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        # Create the prompt for concept identification
        system_prompt = f"""
        You are an expert medical educator specializing in concept identification. Based on the following document content, identify {request.num_concepts} key medical concepts that are most important for learning.

        Document Content:
        {document['content'][:3000]}

        IMPORTANT INSTRUCTIONS:
        - Identify the most important medical concepts from the content
        - Each concept should have a clear, descriptive title
        - Include a comprehensive description explaining the concept
        - Assign importance levels (High, Medium, Low) based on clinical relevance
        - Focus on concepts that are educationally valuable
        - Cover different aspects: pathophysiology, diagnosis, treatment, etc.

        CRITICAL: You must respond with ONLY a valid JSON array. Do not include any markdown formatting, explanations, or additional text. Start your response directly with [ and end with ].

        Format your response as a JSON array with the following structure:
        [
            {{
                "id": "concept_1",
                "title": "Clear Concept Title (e.g., 'Pathophysiology of Myocardial Infarction')",
                "description": "Comprehensive 2-3 sentence description explaining the concept, its clinical significance, and key learning points.",
                "importance": "High/Medium/Low"
            }}
        ]
        """
        
        # Generate response from Gemini
        response = model.generate_content(system_prompt)
        
        # Parse the response
        import json
        print(f"AI Raw Concepts Gemini response: {response.text}")
        
        try:
            # Try to extract JSON from the response if it's wrapped in markdown
            response_text = response.text.strip()
            if response_text.startswith('```json'):
                response_text = response_text.replace('```json', '').replace('```', '').strip()
            elif response_text.startswith('```'):
                response_text = response_text.replace('```', '').strip()
            
            concepts_data = json.loads(response_text)
            print(f"SUCCESS: Successfully parsed Concepts JSON: {len(concepts_data)} concepts")
        except json.JSONDecodeError as e:
            print(f"ERROR: Concepts JSON parsing failed: {e}")
            print(f"Response text: {response.text[:500]}...")
            # If JSON parsing fails, create a fallback response
            concepts_data = [{
                "id": f"concept_{i+1}",
                "title": f"Key Concept {i+1} from Document",
                "description": "A medical concept extracted from the uploaded document content.",
                "importance": "High"
            } for i in range(request.num_concepts)]
        
        # Convert to Concept objects
        concepts = [Concept(**concept) for concept in concepts_data[:request.num_concepts]]
        
        return ConceptResponse(
            document_id=request.document_id,
            concepts=concepts,
            generated_at=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error identifying concepts: {str(e)}")

@app.post("/ai/auto-generate", response_model=AutoGenerationResponse)
async def auto_generate_content(
    request: AutoGenerationRequest,
    current_user: dict = Depends(get_current_user),
    request_obj: Request = None
):
    """Automatically generate all content types from a document - optimized for speed"""
    
    # Rate limiting check
    if request_obj:
        client_ip = request_obj.client.host
        if not rate_limiter.is_allowed(client_ip):
            raise HTTPException(
                status_code=429, 
                detail="Rate limit exceeded. Please wait before making another request."
            )
    
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini AI API key not configured")
    
    print(f" Auto-generation started for document: {request.document_id}")
    
    # Find the document
    try:
        document = db.documents.find_one({
            "_id": ObjectId(request.document_id),
            "uploaded_by": current_user["id"]
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found or access denied")
    
    # Check if document has text content
    if not document.get("content"):
        raise HTTPException(status_code=400, detail="Document does not contain readable text content")
    
    response_data = {
        "document_id": request.document_id,
        "generated_at": datetime.utcnow(),
        "success": True,
        "message": "Auto-generation completed successfully"
    }
    
    try:
        # Initialize Gemini model
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        # Generate Cases
        if request.generate_cases:
            print(f" Generating {request.num_cases} cases...")
            try:
                cases_prompt = f"""Generate {request.num_cases} medical cases from this content:

{document['content'][:2000]}

Return JSON array:
[{{"title": "Case Title", "description": "Brief case description", "key_points": ["point1", "point2", "point3"], "difficulty": "Easy|Moderate|Hard"}}]

Generate exactly {request.num_cases} unique cases."""
                
                cases_response = model.generate_content(cases_prompt)
                import json
                print(f"Raw cases response: {cases_response.text[:500]}...")
                
                try:
                    # Clean the response text
                    response_text = cases_response.text.strip()
                    
                    # Remove markdown formatting if present
                    if response_text.startswith('```json'):
                        response_text = response_text.replace('```json', '').replace('```', '').strip()
                    elif response_text.startswith('```'):
                        response_text = response_text.replace('```', '').strip()
                    
                    # Find JSON array boundaries
                    start_idx = response_text.find('[')
                    end_idx = response_text.rfind(']') + 1
                    
                    if start_idx != -1 and end_idx != -1:
                        json_text = response_text[start_idx:end_idx]
                        cases_data = json.loads(json_text)
                        
                        # Ensure we have the right number of cases
                        if len(cases_data) < request.num_cases:
                            print(f"Warning: Only got {len(cases_data)} cases, expected {request.num_cases}")
                            # If we got fewer cases than requested, try to generate more
                            if len(cases_data) == 0:
                                raise ValueError("No cases generated")
                        
                        # Take the requested number of cases, or all available if fewer
                        cases_to_use = cases_data[:request.num_cases]
                        response_data["cases"] = [CaseScenario(**case) for case in cases_to_use]
                        print(f" Generated {len(response_data['cases'])} cases successfully")
                    else:
                        raise ValueError("No valid JSON array found in response")
                        
                except json.JSONDecodeError as e:
                    print(f" Failed to parse cases JSON: {e}")
                    print(f" Response text: {cases_response.text[:500]}...")
                    # Create fallback cases based on document content
                    fallback_cases = []
                    for i in range(min(request.num_cases, 5)):  # Limit fallback to 5 cases
                        fallback_cases.append({
                            "title": f"Medical Case {i+1} from {document.get('filename', 'Document')}",
                            "description": f"Based on the uploaded document '{document.get('filename', 'Document')}', this case presents a realistic medical scenario involving the key concepts discussed in the document. The case includes detailed patient presentation, relevant medical history, and diagnostic considerations that align with the document content.",
                            "key_points": [
                                "Key medical concept from document",
                                "Diagnostic approach based on document",
                                "Treatment considerations from document",
                                "Clinical reasoning points",
                                "Important learning objective"
                            ],
                            "difficulty": "Moderate"
                        })
                    response_data["cases"] = [CaseScenario(**case) for case in fallback_cases]
                    print(f" Generated {len(response_data['cases'])} fallback cases")
            except Exception as e:
                print(f" Case generation failed: {e}")
                # Create minimal fallback
                fallback_cases = [{
                    "title": f"Case from {document.get('filename', 'Document')}",
                    "description": f"Medical case based on the uploaded document content.",
                    "key_points": ["Document-based learning point 1", "Document-based learning point 2", "Document-based learning point 3"],
                    "difficulty": "Moderate"
                }]
                response_data["cases"] = [CaseScenario(**case) for case in fallback_cases]
        
        # Generate MCQs
        if request.generate_mcqs:
            print(f" Generating {request.num_mcqs} MCQs...")
            try:
                mcq_prompt = f"""Generate {request.num_mcqs} MCQ questions from this content:

{document['content'][:2000]}

Return JSON array:
[{{"id": "mcq_1", "question": "Medical question?", "options": [{{"id": "A", "text": "Option A", "is_correct": false}}, {{"id": "B", "text": "Correct answer", "is_correct": true}}, {{"id": "C", "text": "Option C", "is_correct": false}}, {{"id": "D", "text": "Option D", "is_correct": false}}], "explanation": "Brief explanation", "difficulty": "Easy|Moderate|Hard"}}]

Generate exactly {request.num_mcqs} questions."""
                
                mcq_response = model.generate_content(mcq_prompt)
                print(f"Raw MCQ response: {mcq_response.text[:500]}...")
                
                try:
                    # Clean the response text
                    response_text = mcq_response.text.strip()
                    
                    # Remove markdown formatting if present
                    if response_text.startswith('```json'):
                        response_text = response_text.replace('```json', '').replace('```', '').strip()
                    elif response_text.startswith('```'):
                        response_text = response_text.replace('```', '').strip()
                    
                    # Find JSON array boundaries
                    start_idx = response_text.find('[')
                    end_idx = response_text.rfind(']') + 1
                    
                    if start_idx != -1 and end_idx != -1:
                        json_text = response_text[start_idx:end_idx]
                        mcq_data = json.loads(json_text)
                        
                        # Ensure we have the right number of MCQs
                        if len(mcq_data) < request.num_mcqs:
                            print(f"Warning: Only got {len(mcq_data)} MCQs, expected {request.num_mcqs}")
                            # If we got fewer MCQs than requested, try to generate more
                            if len(mcq_data) == 0:
                                raise ValueError("No MCQs generated")
                        
                        # Take the requested number of MCQs, or all available if fewer
                        mcqs_to_use = mcq_data[:request.num_mcqs]
                        questions = []
                        for mcq in mcqs_to_use:
                            options = [MCQOption(**option) for option in mcq["options"]]
                            question = MCQQuestion(
                                id=mcq["id"],
                                question=mcq["question"],
                                options=options,
                                explanation=mcq["explanation"],
                                difficulty=mcq["difficulty"]
                            )
                            questions.append(question)
                        response_data["mcqs"] = questions
                        print(f" Generated {len(response_data['mcqs'])} MCQs successfully")
                    else:
                        raise ValueError("No valid JSON array found in response")
                        
                except json.JSONDecodeError as e:
                    print(f" Failed to parse MCQs JSON: {e}")
                    print(f" Response text: {mcq_response.text[:500]}...")
                    # Create fallback MCQs based on document content
                    fallback_mcqs = []
                    for i in range(min(request.num_mcqs, 5)):  # Limit fallback to 5 MCQs
                        fallback_mcqs.append({
                            "id": f"mcq_{i+1}",
                            "question": f"Based on the document '{document.get('filename', 'Document')}', which of the following is most accurate?",
                            "options": [
                                {"id": "A", "text": "Option A based on document content", "is_correct": False},
                                {"id": "B", "text": "Option B based on document content", "is_correct": True},
                                {"id": "C", "text": "Option C based on document content", "is_correct": False},
                                {"id": "D", "text": "Option D based on document content", "is_correct": False},
                                {"id": "E", "text": "Option E based on document content", "is_correct": False}
                            ],
                            "explanation": f"This question is based on the key concepts discussed in the uploaded document '{document.get('filename', 'Document')}'.",
                            "difficulty": "Moderate"
                        })
                    
                    questions = []
                    for mcq in fallback_mcqs:
                        options = [MCQOption(**option) for option in mcq["options"]]
                        question = MCQQuestion(
                            id=mcq["id"],
                            question=mcq["question"],
                            options=options,
                            explanation=mcq["explanation"],
                            difficulty=mcq["difficulty"]
                        )
                        questions.append(question)
                    response_data["mcqs"] = questions
                    print(f" Generated {len(response_data['mcqs'])} fallback MCQs")
            except Exception as e:
                print(f" MCQ generation failed: {e}")
                # Create minimal fallback
                fallback_mcq = {
                    "id": "mcq_1",
                    "question": f"Based on the document '{document.get('filename', 'Document')}', which statement is correct?",
                    "options": [
                        {"id": "A", "text": "Option A", "is_correct": False},
                        {"id": "B", "text": "Option B", "is_correct": True},
                        {"id": "C", "text": "Option C", "is_correct": False},
                        {"id": "D", "text": "Option D", "is_correct": False},
                        {"id": "E", "text": "Option E", "is_correct": False}
                    ],
                    "explanation": f"This question is based on the document content.",
                    "difficulty": "Moderate"
                }
                options = [MCQOption(**option) for option in fallback_mcq["options"]]
                question = MCQQuestion(
                    id=fallback_mcq["id"],
                    question=fallback_mcq["question"],
                    options=options,
                    explanation=fallback_mcq["explanation"],
                    difficulty=fallback_mcq["difficulty"]
                )
                response_data["mcqs"] = [question]
        
        # Generate Concepts
        if request.generate_concepts:
            print(f" Generating {request.num_concepts} concepts...")
            try:
                concepts_prompt = f"""Identify {request.num_concepts} key medical concepts from this content:

{document['content'][:2000]}

Return JSON array:
[{{"id": "concept_1", "title": "Medical Concept", "description": "Brief concept description", "importance": "High|Medium|Low"}}]

Identify exactly {request.num_concepts} concepts."""
                
                concepts_response = model.generate_content(concepts_prompt)
                print(f"Raw concepts response: {concepts_response.text[:500]}...")
                
                try:
                    # Clean the response text
                    response_text = concepts_response.text.strip()
                    
                    # Remove markdown formatting if present
                    if response_text.startswith('```json'):
                        response_text = response_text.replace('```json', '').replace('```', '').strip()
                    elif response_text.startswith('```'):
                        response_text = response_text.replace('```', '').strip()
                    
                    # Find JSON array boundaries
                    start_idx = response_text.find('[')
                    end_idx = response_text.rfind(']') + 1
                    
                    if start_idx != -1 and end_idx != -1:
                        json_text = response_text[start_idx:end_idx]
                        concepts_data = json.loads(json_text)
                        
                        # Ensure we have the right number of concepts
                        if len(concepts_data) < request.num_concepts:
                            print(f"Warning: Only got {len(concepts_data)} concepts, expected {request.num_concepts}")
                            # If we got fewer concepts than requested, try to generate more
                            if len(concepts_data) == 0:
                                raise ValueError("No concepts generated")
                        
                        # Take the requested number of concepts, or all available if fewer
                        concepts_to_use = concepts_data[:request.num_concepts]
                        response_data["concepts"] = [Concept(**concept) for concept in concepts_to_use]
                        print(f" Generated {len(response_data['concepts'])} concepts successfully")
                    else:
                        raise ValueError("No valid JSON array found in response")
                        
                except json.JSONDecodeError as e:
                    print(f" Failed to parse concepts JSON: {e}")
                    print(f" Response text: {concepts_response.text[:500]}...")
                    # Create fallback concepts based on document content
                    fallback_concepts = []
                    for i in range(min(request.num_concepts, 5)):  # Limit fallback to 5 concepts
                        fallback_concepts.append({
                            "id": f"concept_{i+1}",
                            "title": f"Key Medical Concept {i+1} from {document.get('filename', 'Document')}",
                            "description": f"This is an important medical concept extracted from the uploaded document '{document.get('filename', 'Document')}'. It represents a fundamental principle or clinical knowledge that is essential for understanding the medical content discussed in the document.",
                            "importance": "High"
                        })
                    response_data["concepts"] = [Concept(**concept) for concept in fallback_concepts]
                    print(f" Generated {len(response_data['concepts'])} fallback concepts")
            except Exception as e:
                print(f" Concept generation failed: {e}")
                # Create minimal fallback
                fallback_concept = {
                    "id": "concept_1",
                    "title": f"Key Concept from {document.get('filename', 'Document')}",
                    "description": f"Important medical concept from the uploaded document content.",
                    "importance": "High"
                }
                response_data["concepts"] = [Concept(**fallback_concept)]
        
        # Generate Case Titles
        if request.generate_titles:
            print(f" Generating {request.num_titles} case titles...")
            try:
                titles_prompt = f"""Generate {request.num_titles} case titles from this document:

{document['content'][:2000]}

Return JSON array only:
[
    {{
        "id": "case_1",
        "title": "Case Title",
        "description": "Brief case description.",
        "difficulty": "Moderate"
    }}
]"""
                
                titles_response = model.generate_content(titles_prompt)
                print(f"Raw titles response: {titles_response.text[:500]}...")
                
                try:
                    # Clean the response text
                    response_text = titles_response.text.strip()
                    
                    # Remove markdown formatting if present
                    if response_text.startswith('```json'):
                        response_text = response_text.replace('```json', '').replace('```', '').strip()
                    elif response_text.startswith('```'):
                        response_text = response_text.replace('```', '').strip()
                    
                    # Find JSON array boundaries
                    start_idx = response_text.find('[')
                    end_idx = response_text.rfind(']') + 1
                    
                    if start_idx != -1 and end_idx != -1:
                        json_text = response_text[start_idx:end_idx]
                        titles_data = json.loads(json_text)
                        
                        # Ensure we have the right number of titles
                        if len(titles_data) < request.num_titles:
                            print(f"Warning: Only got {len(titles_data)} titles, expected {request.num_titles}")
                        
                        response_data["titles"] = [CaseTitle(**title) for title in titles_data[:request.num_titles]]
                        print(f" Generated {len(response_data['titles'])} case titles successfully")
                    else:
                        raise ValueError("No valid JSON array found in response")
                        
                except json.JSONDecodeError as e:
                    print(f" Failed to parse titles JSON: {e}")
                    print(f" Response text: {titles_response.text[:500]}...")
                    # Create fallback titles based on document content
                    fallback_titles = []
                    for i in range(min(request.num_titles, 5)):  # Limit fallback to 5 titles
                        fallback_titles.append({
                            "id": f"case_{i+1}",
                            "title": f"Medical Case {i+1} from {document.get('filename', 'Document')}",
                            "description": f"This case is based on the medical content discussed in the uploaded document '{document.get('filename', 'Document')}' and presents a realistic clinical scenario for learning.",
                            "difficulty": "Moderate"
                        })
                    response_data["titles"] = [CaseTitle(**title) for title in fallback_titles]
                    print(f" Generated {len(response_data['titles'])} fallback case titles")
            except Exception as e:
                print(f" Title generation failed: {e}")
                # Create minimal fallback
                fallback_title = {
                    "id": "case_1",
                    "title": f"Case from {document.get('filename', 'Document')}",
                    "description": f"Medical case based on the uploaded document content.",
                    "difficulty": "Moderate"
                }
                response_data["titles"] = [CaseTitle(**fallback_title)]
        
        print(f" Auto-generation completed successfully!")
        return AutoGenerationResponse(**response_data)
        
    except Exception as e:
        print(f" Auto-generation error: {str(e)}")
        return AutoGenerationResponse(
            document_id=request.document_id,
            generated_at=datetime.utcnow(),
            success=False,
            message=f"Auto-generation failed: {str(e)}"
        )

@app.post("/ai/quick-generate")
async def quick_generate_content(
    request: AutoGenerationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Quick generation endpoint that returns immediately with basic content"""
    
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini AI API key not configured")
    
    print(f" Quick generation started for document: {request.document_id}")
    
    # Find the document
    try:
        document = db.documents.find_one({
            "_id": ObjectId(request.document_id),
            "uploaded_by": current_user["id"]
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found or access denied")
    
    # Check if document has text content
    if not document.get("content"):
        raise HTTPException(status_code=400, detail="Document does not contain readable text content")
    
    try:
        # Initialize Gemini model
        model = genai.GenerativeModel('models/gemini-2.5-flash')
        
        # Generate only MCQs first (most important for user experience)
        mcqs = []
        if request.generate_mcqs:
            print(f" Quick generating {request.num_mcqs} MCQs...")
            try:
                mcq_prompt = f"""Generate {request.num_mcqs} MCQ questions from this document:

{document['content'][:1500]}

Return JSON array only:
[
    {{
        "id": "mcq_1",
        "question": "Question based on document content?",
        "options": [
            {{"id": "A", "text": "Option A", "is_correct": false}},
            {{"id": "B", "text": "Option B", "is_correct": true}},
            {{"id": "C", "text": "Option C", "is_correct": false}},
            {{"id": "D", "text": "Option D", "is_correct": false}},
            {{"id": "E", "text": "Option E", "is_correct": false}}
        ],
        "explanation": "Brief explanation of the correct answer.",
        "difficulty": "Moderate"
    }}
]"""
                
                mcq_response = model.generate_content(mcq_prompt)
                print(f"Quick MCQ response: {mcq_response.text[:200]}...")
                
                try:
                    # Clean the response text
                    response_text = mcq_response.text.strip()
                    
                    # Remove markdown formatting if present
                    if response_text.startswith('```json'):
                        response_text = response_text.replace('```json', '').replace('```', '').strip()
                    elif response_text.startswith('```'):
                        response_text = response_text.replace('```', '').strip()
                    
                    # Find JSON array boundaries
                    start_idx = response_text.find('[')
                    end_idx = response_text.rfind(']') + 1
                    
                    if start_idx != -1 and end_idx != -1:
                        json_text = response_text[start_idx:end_idx]
                        mcq_data = json.loads(json_text)
                        
                        # Convert to MCQQuestion objects
                        for mcq in mcq_data[:request.num_mcqs]:
                            options = [MCQOption(**option) for option in mcq["options"]]
                            question = MCQQuestion(
                                id=mcq["id"],
                                question=mcq["question"],
                                options=options,
                                explanation=mcq["explanation"],
                                difficulty=mcq["difficulty"]
                            )
                            mcqs.append(question)
                        print(f" Quick generated {len(mcqs)} MCQs successfully")
                    else:
                        raise ValueError("No valid JSON array found in response")
                        
                except json.JSONDecodeError as e:
                    print(f" Quick MCQ JSON parsing failed: {e}")
                    # Create fallback MCQs
                    for i in range(min(request.num_mcqs, 3)):
                        fallback_mcq = {
                            "id": f"mcq_{i+1}",
                            "question": f"Based on the document '{document.get('filename', 'Document')}', which statement is correct?",
                            "options": [
                                {"id": "A", "text": "Option A", "is_correct": False},
                                {"id": "B", "text": "Option B", "is_correct": True},
                                {"id": "C", "text": "Option C", "is_correct": False},
                                {"id": "D", "text": "Option D", "is_correct": False},
                                {"id": "E", "text": "Option E", "is_correct": False}
                            ],
                            "explanation": f"This question is based on the document content.",
                            "difficulty": "Moderate"
                        }
                        options = [MCQOption(**option) for option in fallback_mcq["options"]]
                        question = MCQQuestion(
                            id=fallback_mcq["id"],
                            question=fallback_mcq["question"],
                            options=options,
                            explanation=fallback_mcq["explanation"],
                            difficulty=fallback_mcq["difficulty"]
                        )
                        mcqs.append(question)
                    print(f" Quick generated {len(mcqs)} fallback MCQs")
            except Exception as e:
                print(f" Quick MCQ generation failed: {e}")
        
        # Return quick response with MCQs
        return {
            "document_id": request.document_id,
            "mcqs": mcqs,
            "generated_at": datetime.utcnow(),
            "success": True,
            "message": "Quick generation completed - MCQs ready, other content generating in background",
            "status": "partial"
        }
        
    except Exception as e:
        print(f" Quick generation error: {str(e)}")
        return {
            "document_id": request.document_id,
            "generated_at": datetime.utcnow(),
            "success": False,
            "message": f"Quick generation failed: {str(e)}",
            "status": "failed"
        }
    
class ChatRequest(BaseModel):
    """Chat request schema"""
    message: str = Field(..., min_length=1, max_length=1000)
    document_id: Optional[str] = None

class ChatResponse(BaseModel):
    """Chat response schema"""
    response: str
    timestamp: datetime

class ChatSession(BaseModel):
    """Chat session schema"""
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    user_id: str
    document_id: Optional[str] = None
    message_count: int = 0
    document_filename: Optional[str] = None
    document_content_preview: Optional[str] = None
    # Context fields for case/concept specific chats
    case_title: Optional[str] = None
    concept_title: Optional[str] = None
    parent_chat_id: Optional[str] = None  # Reference to main chat

class CreateChatRequest(BaseModel):
    """Create chat request schema"""
    name: Optional[str] = None
    document_id: Optional[str] = None
    # Context fields for case/concept specific chats
    case_title: Optional[str] = None
    concept_title: Optional[str] = None
    parent_chat_id: Optional[str] = None

class ChatMessage(BaseModel):
    """Chat message schema"""
    id: str
    chat_id: str
    message: str
    response: str
    timestamp: datetime
    document_id: Optional[str] = None

class GeneratedCase(BaseModel):
    """Generated case schema for storage"""
    id: str
    chat_id: str
    document_id: str
    title: str
    description: str
    key_points: List[str]
    difficulty: str
    created_at: datetime

class GeneratedMCQ(BaseModel):
    """Generated MCQ schema for storage"""
    id: str
    chat_id: str
    document_id: str
    case_title: Optional[str] = None
    question: str
    options: List[MCQOption]
    explanation: str
    difficulty: str
    created_at: datetime

class GeneratedConcept(BaseModel):
    """Generated concept schema for storage"""
    id: str
    chat_id: str
    document_id: str
    case_title: Optional[str] = None
    title: str
    description: str
    importance: str
    created_at: datetime

@app.post("/ai/chat", response_model=ChatResponse)
async def chat_with_ai(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Chat with AI about uploaded documents"""
    
    print(f"CHAT ENDPOINT CALLED")
    print(f"User: {current_user.get('email', 'unknown')}")
    print(f"Message: {request.message}")
    print(f"Document ID: {request.document_id}")
    
    if not GEMINI_API_KEY:
        print("ERROR: GEMINI_API_KEY not configured")
        raise HTTPException(status_code=500, detail="Gemini AI API key not configured")
    
    # If document_id is provided, get the document context
    document_context = ""
    if request.document_id:
        try:
            document = db.documents.find_one({
                "_id": ObjectId(request.document_id),
                "uploaded_by": current_user["id"]
            })
            if document and document.get("content"):
                document_context = f"\n\nDocument Context:\n{document['content'][:2000]}"  # Limit context
        except Exception:
            pass  # Continue without document context if there's an error
    
    try:
        print("AI: Initializing Gemini model...")
        # Initialize Gemini model - try different model names
        model = None
        model_names = [
            'models/gemini-2.5-flash'
        ]
        
        for model_name in model_names:
            try:
                model = genai.GenerativeModel(model_name)
                print(f"SUCCESS: Using {model_name}")
                break
            except Exception as e:
                print(f"WARNING: {model_name} failed: {e}")
                continue
        
        if not model:
            raise Exception("No working Gemini model found")
        
        print("AI: Creating prompt...")
        # Create the chat prompt
        system_prompt = f"""You are an expert medical AI assistant specializing in medical education and case-based learning. Your role is to provide comprehensive, detailed, and educational responses to help medical students understand complex medical concepts.

        IMPORTANT INSTRUCTIONS:
        - Always provide detailed, comprehensive answers (minimum 3-4 paragraphs)
        - Use specific medical terminology and explain it clearly
        - Include relevant pathophysiology, diagnostic criteria, and treatment options
        - Provide clinical reasoning and differential diagnoses when appropriate
        - Give practical examples and clinical pearls
        - Be thorough but accessible to medical students
        - Never give vague or generic responses
        - Format your response with clear sections and bullet points where appropriate
        - Use markdown formatting for better readability (headers, bold text, lists)

        User Question: {request.message}
        {document_context}
        
        Please provide a comprehensive, detailed response that thoroughly addresses the user's question. Structure your response as follows:

        ## Direct Answer
        Provide a clear, direct answer to the question with specific details and context.

        ## Pathophysiology & Mechanisms
        Explain the underlying biological/medical mechanisms involved, including:
        - Cellular and molecular processes
        - Anatomical considerations
        - Physiological pathways affected

        ## Clinical Significance
        Discuss the clinical implications and importance, covering:
        - Impact on patient care
        - Diagnostic considerations
        - Treatment implications

        ## Key Learning Points
        - **Primary concept**: [Main learning objective]
        - **Diagnostic criteria**: [Key diagnostic features]
        - **Treatment approach**: [Management strategies]
        - **Complications**: [Potential complications to watch for]
        - **Prognosis**: [Expected outcomes and factors affecting prognosis]

        ## Clinical Pearls
        Provide practical tips and important clinical insights that medical students should remember for exams and practice.

        Make your response educational, detailed, and valuable for medical learning."""
        
        print("AI: Generating response from Gemini...")
        # Generate response from Gemini
        response = model.generate_content(system_prompt)
        
        print("SUCCESS: Response generated successfully")
        return ChatResponse(
            response=response.text,
            timestamp=datetime.now()
        )
        
    except Exception as e:
        print(f"ERROR: Error in chat endpoint: {str(e)}")
        print(f"ERROR: Error type: {type(e).__name__}")
        import traceback
        print(f"ERROR: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error generating AI response: {str(e)}")

def generate_chat_name(document_id: Optional[str] = None) -> str:
    """Generate a dynamic chat name"""
    if document_id:
        try:
            document = db.documents.find_one({"_id": ObjectId(document_id)})
            if document:
                # Use document filename as base for chat name
                filename = document.get("filename", "Document")
                # Remove file extension and clean up the name
                name_without_ext = filename.split('.')[0]
                # Truncate if too long
                if len(name_without_ext) > 30:
                    name_without_ext = name_without_ext[:30] + "..."
                return name_without_ext
        except Exception as e:
            print(f"Error generating chat name from document: {e}")
            pass
    
    # Generate timestamp-based name
    timestamp = datetime.now().strftime("%m/%d %H:%M")
    return f"Chat {timestamp}"

@app.post("/chats", response_model=ChatSession, status_code=status.HTTP_201_CREATED)
async def create_chat(
    request: CreateChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a new chat session"""
    
    try:
        print(f"CREATE CHAT ENDPOINT CALLED")
        print(f"Request: {request}")
        print(f"Document ID: {request.document_id}")
        print(f"Current user: {current_user.get('id', 'No user ID')}")
        
        # Generate chat name if not provided
        chat_name = request.name or generate_chat_name(request.document_id)
        print(f"Generated chat name: {chat_name}")
        
        # Get document information if document_id is provided
        document_filename = None
        document_content_preview = None
        
        if request.document_id:
            try:
                document = db.documents.find_one({
                    "_id": ObjectId(request.document_id),
                    "uploaded_by": current_user["id"]
                })
                if document:
                    document_filename = document.get("filename", "Unknown Document")
                    # Store first 200 characters as preview
                    document_content_preview = document.get("content", "")[:200] + "..." if len(document.get("content", "")) > 200 else document.get("content", "")
            except Exception as e:
                print(f"Error fetching document info: {e}")
        
        # Create chat session
        chat_doc = {
            "name": chat_name,
            "user_id": current_user["id"],
            "document_id": request.document_id,
            "document_filename": document_filename,
            "document_content_preview": document_content_preview,
            "message_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            # Context fields
            "case_title": request.case_title,
            "concept_title": request.concept_title,
            "parent_chat_id": request.parent_chat_id
        }
        
        print(f"Chat document to insert: {chat_doc}")
        result = db.chats.insert_one(chat_doc)
        print(f"Chat created with ID: {result.inserted_id}")
        
        chat_doc["id"] = str(result.inserted_id)
        del chat_doc["_id"]
        
        print(f"Returning chat: {chat_doc}")
        return chat_doc
        
    except Exception as e:
        print(f"ERROR: Error creating chat: {str(e)}")
        print(f"ERROR: Error type: {type(e).__name__}")
        import traceback
        print(f"ERROR: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error creating chat: {str(e)}")

@app.get("/chats", response_model=List[ChatSession])
async def get_user_chats(current_user: dict = Depends(get_current_user)):
    """Get all chat sessions for the current user"""
    
    print(f"🔍 GET_CHATS: User ID: {current_user.get('id', 'No ID')}")
    print(f"🔍 GET_CHATS: User email: {current_user.get('email', 'No email')}")
    
    chats = list(db.chats.find(
        {"user_id": current_user["id"]}
    ).sort("updated_at", -1))
    
    print(f"🔍 GET_CHATS: Found {len(chats)} chats in database")
    
    for chat in chats:
        chat["id"] = str(chat["_id"])
        del chat["_id"]
        print(f"🔍 GET_CHATS: Chat {chat['id']} - {chat.get('name', 'No name')}")
    
    print(f"🔍 GET_CHATS: Returning {len(chats)} chats")
    return chats

@app.get("/chats/{chat_id}", response_model=ChatSession)
async def get_chat(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific chat session"""
    
    try:
        chat = db.chats.find_one({
            "_id": ObjectId(chat_id),
            "user_id": current_user["id"]
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid chat ID")
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    chat["id"] = str(chat["_id"])
    del chat["_id"]
    
    return chat

@app.delete("/chats/{chat_id}")
async def delete_chat(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a chat session and all its messages"""
    
    try:
        # Verify chat belongs to user
        chat = db.chats.find_one({
            "_id": ObjectId(chat_id),
            "user_id": current_user["id"]
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid chat ID")
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Delete chat and all its associated data
    db.chats.delete_one({"_id": ObjectId(chat_id)})
    db.chat_messages.delete_many({"chat_id": chat_id})
    
    # Delete all generated content for this chat
    db.generated_cases.delete_many({"chat_id": chat_id})
    db.generated_mcqs.delete_many({"chat_id": chat_id})
    db.generated_concepts.delete_many({"chat_id": chat_id})
    
    print(f"✅ Deleted chat {chat_id} and all associated content")
    return {"message": "Chat deleted successfully"}

@app.post("/chats/{chat_id}/messages", response_model=ChatMessage, status_code=status.HTTP_201_CREATED)
async def send_chat_message(
    chat_id: str,
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    request_obj: Request = None
):
    """Send a message in a specific chat session"""
    
    # Rate limiting check
    if request_obj:
        client_ip = request_obj.client.host
        if not rate_limiter.is_allowed(client_ip):
            raise HTTPException(
                status_code=429, 
                detail="Rate limit exceeded. Please wait before making another request."
            )
    
    # Verify chat belongs to user
    try:
        chat = db.chats.find_one({
            "_id": ObjectId(chat_id),
            "user_id": current_user["id"]
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid chat ID")
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Get AI response using existing chat endpoint logic
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini AI API key not configured")
    
    # If document_id is provided, get the document context
    document_context = ""
    document_id = request.document_id or chat.get("document_id")
    if document_id:
        try:
            document = db.documents.find_one({
                "_id": ObjectId(document_id),
                "uploaded_by": current_user["id"]
            })
            if document and document.get("content"):
                document_context = f"\n\nDocument Context:\n{document['content'][:2000]}"
        except Exception:
            pass
    
    try:
        # Initialize Gemini model - try different model names
        model = None
        model_names = [
            'models/gemini-2.5-flash',
        ]
        
        for model_name in model_names:
            try:
                model = genai.GenerativeModel(model_name)
                print(f"SUCCESS: Using {model_name} for chat")
                break
            except Exception as e:
                print(f"WARNING: {model_name} failed: {e}")
                continue
        
        if not model:
            raise Exception("No working Gemini model found")
        
        # Create the chat prompt
        system_prompt = f"""You are an expert medical AI assistant specializing in medical education and case-based learning. Your role is to provide comprehensive, detailed, and educational responses to help medical students understand complex medical concepts.

        IMPORTANT INSTRUCTIONS:
        - Always provide detailed, comprehensive answers (minimum 3-4 paragraphs)
        - Use specific medical terminology and explain it clearly
        - Include relevant pathophysiology, diagnostic criteria, and treatment options
        - Provide clinical reasoning and differential diagnoses when appropriate
        - Give practical examples and clinical pearls
        - Be thorough but accessible to medical students
        - Never give vague or generic responses
        - Format your response with clear sections and bullet points where appropriate
        - Use markdown formatting for better readability (headers, bold text, lists)

        User Question: {request.message}
        {document_context}
        
        Please provide a comprehensive, detailed response that thoroughly addresses the user's question. Structure your response as follows:

        ## Direct Answer
        Provide a clear, direct answer to the question with specific details and context.

        ## Pathophysiology & Mechanisms
        Explain the underlying biological/medical mechanisms involved, including:
        - Cellular and molecular processes
        - Anatomical considerations
        - Physiological pathways affected

        ## Clinical Significance
        Discuss the clinical implications and importance, covering:
        - Impact on patient care
        - Diagnostic considerations
        - Treatment implications

        ## Key Learning Points
        - **Primary concept**: [Main learning objective]
        - **Diagnostic criteria**: [Key diagnostic features]
        - **Treatment approach**: [Management strategies]
        - **Complications**: [Potential complications to watch for]
        - **Prognosis**: [Expected outcomes and factors affecting prognosis]

        ## Clinical Pearls
        Provide practical tips and important clinical insights that medical students should remember for exams and practice.

        Make your response educational, detailed, and valuable for medical learning."""
        
        # Generate response from Gemini
        response = model.generate_content(system_prompt)
        ai_response = response.text
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating AI response: {str(e)}")
    
    # Save message to database
    message_doc = {
        "chat_id": chat_id,
        "message": request.message,
        "response": ai_response,
        "document_id": document_id,
        "timestamp": datetime.now()
    }
    
    result = db.chat_messages.insert_one(message_doc)
    
    # Update chat message count and timestamp
    db.chats.update_one(
        {"_id": ObjectId(chat_id)},
        {
            "$inc": {"message_count": 1},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    message_doc["id"] = str(result.inserted_id)
    del message_doc["_id"]
    
    return message_doc

@app.put("/chats/{chat_id}/document", response_model=ChatSession)
async def update_chat_document(
    chat_id: str,
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Update a chat with document information"""
    
    try:
        # Verify chat belongs to user
        chat = db.chats.find_one({
            "_id": ObjectId(chat_id),
            "user_id": current_user["id"]
        })
        
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Get document information
        document = db.documents.find_one({
            "_id": ObjectId(document_id),
            "uploaded_by": current_user["id"]
        })
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Update chat with document information
        document_filename = document.get("filename", "Unknown Document")
        chat_name = re.sub(r'\.[^/.]+$', '', document_filename) if document_filename else "Chat"
        
        update_data = {
            "document_id": document_id,
            "document_filename": document_filename,
            "document_content_preview": document.get("content", "")[:200] + "..." if len(document.get("content", "")) > 200 else document.get("content", ""),
            "name": chat_name,  # Update chat name to match document filename
            "updated_at": datetime.utcnow()
        }
        
        result = db.chats.update_one(
            {"_id": ObjectId(chat_id)},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to update chat")
        
        # Return updated chat
        updated_chat = db.chats.find_one({"_id": ObjectId(chat_id)})
        updated_chat["id"] = str(updated_chat["_id"])
        del updated_chat["_id"]
        
        print(f"✅ Chat {chat_id} updated with document {document_id}")
        return updated_chat
        
    except Exception as e:
        print(f"❌ Error updating chat with document: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating chat: {str(e)}")

@app.get("/chats/{chat_id}/messages", response_model=List[ChatMessage])
async def get_chat_messages(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all messages for a specific chat session"""
    
    # Verify chat belongs to user
    try:
        chat = db.chats.find_one({
            "_id": ObjectId(chat_id),
            "user_id": current_user["id"]
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid chat ID")
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    messages = list(db.chat_messages.find(
        {"chat_id": chat_id}
    ).sort("timestamp", 1))
    
    for message in messages:
        message["id"] = str(message["_id"])
        del message["_id"]
    
    return messages

@app.post("/chats/{chat_id}/content/save")
async def save_generated_content(
    chat_id: str,
    content: dict,
    current_user: dict = Depends(get_current_user)
):
    """Save generated content (cases, MCQs, concepts) for a chat"""
    
    try:
        # Verify chat belongs to user
        chat = db.chats.find_one({
            "_id": ObjectId(chat_id),
            "user_id": current_user["id"]
        })
        
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        document_id = chat.get("document_id")
        if not document_id:
            raise HTTPException(status_code=400, detail="No document associated with this chat")
        
        # Save cases
        if content.get("cases"):
            for case in content["cases"]:
                case_doc = {
                    "chat_id": chat_id,
                    "document_id": document_id,
                    "title": case["title"],
                    "description": case["description"],
                    "key_points": case["key_points"],
                    "difficulty": case["difficulty"],
                    "created_at": datetime.utcnow()
                }
                db.generated_cases.insert_one(case_doc)
        
        # Save MCQs
        if content.get("mcqs"):
            for mcq in content["mcqs"]:
                mcq_doc = {
                    "chat_id": chat_id,
                    "document_id": document_id,
                    "case_title": content.get("case_title"),
                    "question": mcq["question"],
                    "options": mcq["options"],
                    "explanation": mcq["explanation"],
                    "difficulty": mcq["difficulty"],
                    "created_at": datetime.utcnow()
                }
                db.generated_mcqs.insert_one(mcq_doc)
        
        # Save concepts
        if content.get("concepts"):
            for concept in content["concepts"]:
                concept_doc = {
                    "chat_id": chat_id,
                    "document_id": document_id,
                    "case_title": content.get("case_title"),
                    "title": concept["title"],
                    "description": concept["description"],
                    "importance": concept["importance"],
                    "created_at": datetime.utcnow()
                }
                db.generated_concepts.insert_one(concept_doc)
        
        print(f"✅ Saved generated content for chat {chat_id}")
        return {"message": "Content saved successfully"}
        
    except Exception as e:
        print(f"❌ Error saving generated content: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving content: {str(e)}")

@app.get("/chats/{chat_id}/content")
async def get_generated_content(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all generated content for a chat"""
    
    try:
        # Verify chat belongs to user
        chat = db.chats.find_one({
            "_id": ObjectId(chat_id),
            "user_id": current_user["id"]
        })
        
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        # Get cases
        cases = list(db.generated_cases.find({"chat_id": chat_id}))
        for case in cases:
            case["id"] = str(case["_id"])
            del case["_id"]
        
        # Get MCQs
        mcqs = list(db.generated_mcqs.find({"chat_id": chat_id}))
        for mcq in mcqs:
            mcq["id"] = str(mcq["_id"])
            del mcq["_id"]
        
        # Get concepts
        concepts = list(db.generated_concepts.find({"chat_id": chat_id}))
        for concept in concepts:
            concept["id"] = str(concept["_id"])
            del concept["_id"]
        
        print(f"✅ Retrieved content for chat {chat_id}: {len(cases)} cases, {len(mcqs)} MCQs, {len(concepts)} concepts")
        
        return {
            "cases": cases,
            "mcqs": mcqs,
            "concepts": concepts
        }
        
    except Exception as e:
        print(f"❌ Error retrieving generated content: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving content: {str(e)}")

@app.post("/chats/context", response_model=ChatSession, status_code=status.HTTP_201_CREATED)
async def get_or_create_context_chat(
    request: CreateChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Get or create a context-specific chat (case/concept)"""
    
    try:
        print(f"CONTEXT CHAT: Request: {request}")
        print(f"CONTEXT CHAT: User: {current_user.get('id')}")
        
        # Look for existing context chat
        query = {
            "user_id": current_user["id"],
            "document_id": request.document_id
        }
        
        if request.case_title:
            query["case_title"] = request.case_title
        if request.concept_title:
            query["concept_title"] = request.concept_title
        if request.parent_chat_id:
            query["parent_chat_id"] = request.parent_chat_id
        
        existing_chat = db.chats.find_one(query)
        
        if existing_chat:
            print(f"CONTEXT CHAT: Found existing chat: {existing_chat['_id']}")
            existing_chat["id"] = str(existing_chat["_id"])
            del existing_chat["_id"]
            return existing_chat
        
        # Create new context chat
        print(f"CONTEXT CHAT: Creating new context chat")
        
        # Generate context-specific name
        context_name = ""
        if request.concept_title:
            context_name = f"Concept: {request.concept_title}"
        elif request.case_title:
            context_name = f"Case: {request.case_title}"
        else:
            context_name = f"Chat {datetime.now().strftime('%m/%d %H:%M')}"
        
        # Get document info if available
        document_filename = None
        document_content_preview = None
        if request.document_id:
            try:
                document = db.documents.find_one({
                    "_id": ObjectId(request.document_id),
                    "uploaded_by": current_user["id"]
                })
                if document:
                    document_filename = document.get("filename", "Unknown Document")
                    document_content_preview = document.get("content", "")[:200] + "..." if len(document.get("content", "")) > 200 else document.get("content", "")
            except Exception as e:
                print(f"Error fetching document info: {e}")
        
        # Create context chat
        chat_doc = {
            "name": context_name,
            "user_id": current_user["id"],
            "document_id": request.document_id,
            "document_filename": document_filename,
            "document_content_preview": document_content_preview,
            "message_count": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "case_title": request.case_title,
            "concept_title": request.concept_title,
            "parent_chat_id": request.parent_chat_id
        }
        
        result = db.chats.insert_one(chat_doc)
        chat_doc["id"] = str(result.inserted_id)
        del chat_doc["_id"]
        
        print(f"CONTEXT CHAT: Created new chat: {chat_doc['id']}")
        return chat_doc
        
    except Exception as e:
        print(f"❌ Error creating context chat: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating context chat: {str(e)}")


@app.get("/")
def root():
    return {
        "message": "Medical AI - Casewise Backend", 
        "status": "running",
        "database": "Casewise",
        "version": "2.0.0",
        "features": [
            "Document Upload & Storage",
            "Automatic Content Generation",
            "Medical Case Generation",
            "MCQ Question Generation", 
            "Concept Identification",
            "AI Chat with Documents",
            "Chat Session Management"
        ],
        "endpoints": [
            "/signup", 
            "/login", 
            "/auth/google",
            "/me",
            "/documents/upload",
            "/ai/auto-generate",
            "/ai/generate-cases",
            "/ai/generate-case-titles",
            "/ai/generate-mcqs",
            "/ai/identify-concepts",
            "/ai/chat",
            "/chats",
            "/chats/{chat_id}",
            "/chats/{chat_id}/messages"
        ]
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)