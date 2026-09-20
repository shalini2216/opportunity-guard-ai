from flask import Blueprint, request, jsonify, Response
import json
from datetime import datetime, timezone
from bson import ObjectId
from utils.db import get_db
from utils.security import token_required, log_audit
from config import Config

settings_bp = Blueprint("settings", __name__)

@settings_bp.route("", methods=["GET"])
@token_required
def get_settings():
    """Retrieve user personalization settings and options."""
    user = request.current_user
    default_settings = {
        "quiet_hours_enabled": True,
        "quiet_hours_start": Config.DEFAULT_QUIET_HOURS_START,
        "quiet_hours_end": Config.DEFAULT_QUIET_HOURS_END,
        "max_notifications_per_day": Config.DEFAULT_MAX_NOTIFICATIONS_PER_DAY,
        "priority_categories": Config.DEFAULT_PRIORITY_CATEGORIES,
        "sound_alerts_enabled": True,
        "email_notifications_enabled": False
    }

    user_settings = user.get("settings", {})
    # merge with defaults
    for k, v in default_settings.items():
        if k not in user_settings:
            user_settings[k] = v

    return jsonify({
        "success": True,
        "settings": user_settings,
        "available_categories": Config.CATEGORIES
    })

@settings_bp.route("", methods=["PUT"])
@token_required
def update_settings():
    """Update personalization preferences."""
    data = request.get_json() or {}
    db = get_db()
    user_id = request.user_id

    current_settings = request.current_user.get("settings", {})

    # Update allowed fields
    if "quiet_hours_enabled" in data:
        current_settings["quiet_hours_enabled"] = bool(data["quiet_hours_enabled"])
    if "quiet_hours_start" in data:
        current_settings["quiet_hours_start"] = str(data["quiet_hours_start"])
    if "quiet_hours_end" in data:
        current_settings["quiet_hours_end"] = str(data["quiet_hours_end"])
    if "max_notifications_per_day" in data:
        current_settings["max_notifications_per_day"] = max(1, int(data["max_notifications_per_day"]))
    if "priority_categories" in data:
        cats = [c.upper() for c in data["priority_categories"] if c.upper() in Config.CATEGORIES]
        current_settings["priority_categories"] = cats
    if "sound_alerts_enabled" in data:
        current_settings["sound_alerts_enabled"] = bool(data["sound_alerts_enabled"])

    db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"settings": current_settings}})
    log_audit(user_id, "SETTINGS_UPDATED", current_settings)

    return jsonify({"success": True, "message": "Settings updated successfully", "settings": current_settings})

@settings_bp.route("/privacy", methods=["GET"])
@token_required
def get_privacy_dashboard():
    """Privacy Dashboard: returns summary of stored data, retention stats, and recent audit logs."""
    db = get_db()
    user_id = request.user_id

    emails_count = db.emails.count_documents({"user_id": user_id})
    opps_count = db.opportunities.count_documents({"user_id": user_id})
    reminders_count = db.reminders.count_documents({"user_id": user_id})
    notifs_count = db.notifications.count_documents({"user_id": user_id})

    # Recent 20 audit events
    audit_cursor = db.audit_logs.find({"user_id": user_id}).sort("timestamp", -1).limit(20)
    audit_logs = []
    for log in audit_cursor:
        audit_logs.append({
            "id": str(log["_id"]),
            "action": log.get("action"),
            "details": log.get("details", {}),
            "ip_address": log.get("ip_address"),
            "timestamp": log.get("timestamp")
        })

    return jsonify({
        "success": True,
        "stats": {
            "emails_stored": emails_count,
            "opportunities_tracked": opps_count,
            "reminders_logged": reminders_count,
            "notifications_logged": notifs_count
        },
        "audit_logs": audit_logs,
        "privacy_policy_summary": "OpportunityGuard AI only stores minimal metadata and extracted dates/links. Full email bodies are not indefinitely retained and never used to train global public models."
    })

@settings_bp.route("/privacy/purge-data", methods=["DELETE"])
@token_required
def purge_user_data():
    """GDPR / Privacy Data deletion control: purges all opportunity and email data for user."""
    db = get_db()
    user_id = request.user_id

    db.emails.delete_many({"user_id": user_id})
    db.opportunities.delete_many({"user_id": user_id})
    db.reminders.delete_many({"user_id": user_id})
    db.notifications.delete_many({"user_id": user_id})
    db.email_accounts.delete_many({"user_id": user_id})

    log_audit(user_id, "PURGE_ALL_DATA", {"action": "User initiated full mailbox data wipe"})

    return jsonify({"success": True, "message": "All email, opportunity, reminder, and notification data purged successfully."})

@settings_bp.route("/privacy/export", methods=["GET"])
@token_required
def export_user_data():
    """Export all user data as a JSON file."""
    db = get_db()
    user_id = request.user_id

    emails = list(db.emails.find({"user_id": user_id}, {"_id": 0}))
    opps = list(db.opportunities.find({"user_id": user_id}, {"_id": 0}))
    reminders = list(db.reminders.find({"user_id": user_id}, {"_id": 0}))
    notifs = list(db.notifications.find({"user_id": user_id}, {"_id": 0}))

    export_payload = {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "user_email": request.current_user["email"],
        "emails": emails,
        "opportunities": opps,
        "reminders": reminders,
        "notifications": notifs
    }

    log_audit(user_id, "DATA_EXPORT_DOWNLOAD")

    return Response(
        json.dumps(export_payload, indent=2, default=str),
        mimetype="application/json",
        headers={"Content-Disposition": f"attachment; filename=opportunityguard_export_{user_id}.json"}
    )
