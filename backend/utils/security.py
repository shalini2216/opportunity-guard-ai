import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import request, jsonify
from bson import ObjectId
from config import Config
from utils.db import get_db

def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def generate_jwt_token(user_id: str, email: str) -> str:
    """Generate a signed JWT token for the authenticated user."""
    payload = {
        "sub": user_id,
        "email": email,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + Config.JWT_EXPIRATION_DELTA
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")

def token_required(f):
    """Decorator to enforce valid JWT Bearer authentication."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header:
            return jsonify({"error": "Authorization header is missing", "success": False}), 401
        
        parts = auth_header.split(" ")
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return jsonify({"error": "Invalid Authorization header format. Expected 'Bearer <token>'", "success": False}), 401
        
        token = parts[1]
        try:
            payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("sub")
            if not user_id:
                return jsonify({"error": "Invalid token payload", "success": False}), 401
            
            db = get_db()
            user = db.users.find_one({"_id": ObjectId(user_id)})
            if not user:
                return jsonify({"error": "User no longer exists", "success": False}), 401
            
            # Attach current_user to kwargs or Flask request context
            request.current_user = user
            request.user_id = str(user["_id"])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session token has expired. Please log in again.", "success": False}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid authentication token", "success": False}), 401
        except Exception as e:
            return jsonify({"error": "Authentication failure", "details": str(e), "success": False}), 401

        return f(*args, **kwargs)
    return decorated

def log_audit(user_id: str, action: str, details: dict = None, ip_address: str = None):
    """Write an audit entry for security and data events."""
    try:
        db = get_db()
        entry = {
            "user_id": user_id,
            "action": action,
            "details": details or {},
            "ip_address": ip_address or request.remote_addr if request else "system",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        db.audit_logs.insert_one(entry)
    except Exception as e:
        print(f"Audit log write failed: {e}")
