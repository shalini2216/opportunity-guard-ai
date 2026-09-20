import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "opportunity-guard-secret-key-change-in-production-2026")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "opportunity-guard-jwt-key-change-in-prod")
    JWT_EXPIRATION_DELTA = timedelta(days=7)

    # MongoDB
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/opportunity_guard")
    DB_NAME = os.getenv("DB_NAME", "opportunity_guard")

    # AI / LLM (Optional Gemini key, with robust rule-based fallback if absent)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

    # Gmail OAuth
    GMAIL_CLIENT_ID = os.getenv("GMAIL_CLIENT_ID", "")
    GMAIL_CLIENT_SECRET = os.getenv("GMAIL_CLIENT_SECRET", "")
    GMAIL_REDIRECT_URI = os.getenv("GMAIL_REDIRECT_URI", "http://localhost:5000/api/email/oauth/callback")

    # Categories
    CATEGORIES = [
        "EXAM",
        "INTERNSHIP",
        "JOB",
        "INTERVIEW",
        "MEETING",
        "ASSIGNMENT",
        "REGISTRATION",
        "COLLEGE",
        "EVENT",
        "FINANCE",
        "SECURITY",
        "GENERAL",
        "OTHER"
    ]

    # Email / Opportunity States
    EMAIL_STATES = [
        "UNOPENED",
        "OPENED",
        "ACKNOWLEDGED",
        "ACTION_PENDING",
        "COMPLETED",
        "EXPIRED",
        "DISMISSED"
    ]

    # Default Escalation Intervals in minutes (T+0, T+30m, T+2h, T+6h, T+12h)
    DEFAULT_ESCALATION_SCHEDULE_MINUTES = [0, 30, 120, 360, 720]

    # Defaults for User Settings
    DEFAULT_QUIET_HOURS_START = "22:00"
    DEFAULT_QUIET_HOURS_END = "07:00"
    DEFAULT_MAX_NOTIFICATIONS_PER_DAY = 15
    DEFAULT_PRIORITY_CATEGORIES = [
        "EXAM",
        "INTERNSHIP",
        "JOB",
        "INTERVIEW",
        "REGISTRATION",
        "ASSIGNMENT"
    ]
