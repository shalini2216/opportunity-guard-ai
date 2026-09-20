from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from bson import ObjectId
from utils.db import get_db
from utils.security import token_required
from services.reminder_engine import run_reminder_check_cycle

reminders_bp = Blueprint("reminders", __name__)

@reminders_bp.route("", methods=["GET"])
@token_required
def list_reminders():
    """List reminder schedule and history for authenticated user."""
    db = get_db()
    user_id = request.user_id

    status = request.args.get("status")
    query = {"user_id": user_id}
    if status:
        query["status"] = status.upper()

    cursor = db.reminders.find(query).sort("schedule_time", 1).limit(100)
    items = []
    for r in cursor:
        items.append({
            "id": str(r["_id"]),
            "opportunity_id": r.get("opportunity_id"),
            "title": r.get("title"),
            "category": r.get("category"),
            "urgency_level": r.get("urgency_level"),
            "escalation_step": r.get("escalation_step", 0),
            "minutes_offset": r.get("minutes_offset", 0),
            "type": r.get("type"),
            "schedule_time": r.get("schedule_time"),
            "status": r.get("status"),
            "stop_reason": r.get("stop_reason"),
            "sent_at": r.get("sent_at")
        })

    return jsonify({"success": True, "count": len(items), "reminders": items})

@reminders_bp.route("/cycle", methods=["POST"])
@token_required
def trigger_reminder_cycle():
    """Manually trigger a reminder check cycle."""
    stats = run_reminder_check_cycle()
    return jsonify({"success": True, "stats": stats})
