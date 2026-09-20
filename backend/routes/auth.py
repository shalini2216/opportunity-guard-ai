from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from bson import ObjectId
from utils.db import get_db
from utils.security import hash_password, verify_password, generate_jwt_token, token_required, log_audit
from utils.validators import validate_registration_payload
from config import Config

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new user."""
    data = request.get_json() or {}
    errors = validate_registration_payload(data)
    if errors:
        return jsonify({"error": "Validation failed", "details": errors, "success": False}), 400

    db = get_db()
    email = data["email"].strip().lower()
    existing = db.users.find_one({"email": email})
    if existing:
        return jsonify({"error": "An account with this email address already exists.", "success": False}), 409

    now_iso = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "email": email,
        "name": data["name"].strip(),
        "password_hash": hash_password(data["password"]),
        "settings": {
            "quiet_hours_enabled": True,
            "quiet_hours_start": Config.DEFAULT_QUIET_HOURS_START,
            "quiet_hours_end": Config.DEFAULT_QUIET_HOURS_END,
            "max_notifications_per_day": Config.DEFAULT_MAX_NOTIFICATIONS_PER_DAY,
            "priority_categories": Config.DEFAULT_PRIORITY_CATEGORIES,
            "sound_alerts_enabled": True
        },
        "created_at": now_iso,
        "last_login": now_iso
    }

    res = db.users.insert_one(user_doc)
    user_id = str(res.inserted_id)

    token = generate_jwt_token(user_id, email)
    log_audit(user_id, "USER_REGISTER", {"email": email})

    return jsonify({
        "success": True,
        "message": "User registered successfully",
        "token": token,
        "user": {
            "id": user_id,
            "email": email,
            "name": data["name"].strip(),
            "settings": user_doc["settings"]
        }
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate user with email and password."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required.", "success": False}), 400

    db = get_db()
    # Support email matching (including dhonthu / donthu spelling variations)
    user = db.users.find_one({"email": email})
    if not user and email == "donthushalini@gmail.com":
        user = db.users.find_one({"email": "dhonthushalini@gmail.com"})
    elif not user and email == "dhonthushalini@gmail.com":
        user = db.users.find_one({"email": "donthushalini@gmail.com"})

    if not user:
        return jsonify({"error": "Invalid email or password.", "success": False}), 401

    clean_pw = password.strip()
    clean_pw_nospace = clean_pw.replace(" ", "")

    # 1. Verify standard password hash
    is_valid = verify_password(clean_pw, user.get("password_hash", "")) or verify_password(clean_pw_nospace, user.get("password_hash", ""))

    # 2. Check if user typed their connected Gmail App Password
    if not is_valid:
        acc = db.email_accounts.find_one({"user_id": str(user["_id"])})
        if acc:
            stored_app_pw = (acc.get("app_password") or "").strip().replace(" ", "")
            if stored_app_pw and (clean_pw == stored_app_pw or clean_pw_nospace == stored_app_pw):
                is_valid = True
                # Automatically sync password_hash so both passwords work seamlessly
                db.users.update_one({"_id": user["_id"]}, {"$set": {"password_hash": hash_password(clean_pw)}})

    if not is_valid:
        return jsonify({"error": "Invalid email or password. Please verify your password or use your 16-character App Password.", "success": False}), 401

    user_id = str(user["_id"])
    now_iso = datetime.now(timezone.utc).isoformat()
    db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login": now_iso}})

    token = generate_jwt_token(user_id, email)
    log_audit(user_id, "USER_LOGIN", {"email": email})

    return jsonify({
        "success": True,
        "token": token,
        "user": {
            "id": user_id,
            "email": user["email"],
            "name": user.get("name", "OpportunityGuard User"),
            "settings": user.get("settings", {})
        }
    }), 200

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Reset password for user by email."""
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    new_password = data.get("new_password") or ""

    if not email or not new_password:
        return jsonify({"error": "Email and new password are required", "success": False}), 400

    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters", "success": False}), 400

    db = get_db()
    user = db.users.find_one({"email": email})
    if not user and email == "donthushalini@gmail.com":
        user = db.users.find_one({"email": "dhonthushalini@gmail.com"})
    elif not user and email == "dhonthushalini@gmail.com":
        user = db.users.find_one({"email": "donthushalini@gmail.com"})

    if not user:
        return jsonify({"error": "User with this email not found", "success": False}), 404

    db.users.update_one({"_id": user["_id"]}, {"$set": {"password_hash": hash_password(new_password)}})
    log_audit(str(user["_id"]), "PASSWORD_RESET", {"email": email})
    return jsonify({"success": True, "message": "Password reset successfully! You can now log in."})

@auth_bp.route("/me", methods=["GET"])
@token_required
def get_current_user():
    """Retrieve profile and settings of currently authenticated user."""
    user = request.current_user
    return jsonify({
        "success": True,
        "user": {
            "id": str(user["_id"]),
            "email": user["email"],
            "name": user.get("name", ""),
            "settings": user.get("settings", {}),
            "created_at": user.get("created_at")
        }
    })
