from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from bson import ObjectId
from utils.db import get_db
from utils.security import token_required

notifications_bp = Blueprint("notifications", __name__)

@notifications_bp.route("", methods=["GET"])
@token_required
def get_notifications():
    """List notifications for authenticated user."""
    db = get_db()
    user_id = request.user_id

    status = request.args.get("status")
    query = {"user_id": user_id}
    if status:
        query["status"] = status.upper()

    notifs_cursor = db.notifications.find(query).sort("created_at", -1).limit(50)
    results = []
    unread_count = 0
    for n in notifs_cursor:
        is_unread = n.get("status") == "UNREAD"
        if is_unread:
            unread_count += 1
        results.append({
            "id": str(n["_id"]),
            "opportunity_id": n.get("opportunity_id"),
            "title": n.get("title"),
            "message": n.get("message"),
            "urgency_level": n.get("urgency_level", "Normal"),
            "status": n.get("status", "UNREAD"),
            "created_at": n.get("created_at")
        })

    # Total unread count
    total_unread = db.notifications.count_documents({"user_id": user_id, "status": "UNREAD"})

    return jsonify({
        "success": True,
        "unread_count": total_unread,
        "notifications": results
    })

@notifications_bp.route("/<notif_id>/read", methods=["POST"])
@token_required
def mark_notification_read(notif_id):
    """Mark single notification as read."""
    db = get_db()
    try:
        db.notifications.update_one(
            {"_id": ObjectId(notif_id), "user_id": request.user_id},
            {"$set": {"status": "READ", "read_at": datetime.now(timezone.utc).isoformat()}}
        )
    except Exception:
        return jsonify({"error": "Invalid notification ID", "success": False}), 400

    return jsonify({"success": True, "message": "Notification marked as read."})

@notifications_bp.route("/read-all", methods=["POST"])
@token_required
def mark_all_read():
    """Mark all notifications for current user as read."""
    db = get_db()
    db.notifications.update_many(
        {"user_id": request.user_id, "status": "UNREAD"},
        {"$set": {"status": "READ", "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return jsonify({"success": True, "message": "All notifications marked as read."})
