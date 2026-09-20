from flask import Blueprint, request, jsonify, Response
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from utils.db import get_db
from utils.security import token_required, log_audit
from utils.calendar_export import generate_google_calendar_url, generate_ics_content
from services.reminder_engine import stop_all_reminders_for_opportunity, stop_unread_reminders_for_opportunity
from services.risk_engine import calculate_risk_score

opportunities_bp = Blueprint("opportunities", __name__)

@opportunities_bp.route("", methods=["GET"])
@token_required
def list_opportunities():
    """List opportunities for user, ordered by urgency score descending."""
    db = get_db()
    user_id = request.user_id

    category = request.args.get("category")
    status = request.args.get("status")
    urgency_level = request.args.get("urgency_level")

    query = {"user_id": user_id}
    if category:
        query["category"] = category.upper()
    if status:
        query["status"] = status.upper()
    if urgency_level:
        query["urgency_level"] = urgency_level.capitalize()

    opps_cursor = db.opportunities.find(query).sort("urgency_score", -1)
    results = []
    for opp in opps_cursor:
        results.append({
            "id": str(opp["_id"]),
            "email_id": opp.get("email_id"),
            "title": opp.get("title"),
            "sender": opp.get("sender"),
            "category": opp.get("category"),
            "urgency_score": opp.get("urgency_score", 0),
            "urgency_level": opp.get("urgency_level", "Normal"),
            "urgency_reasons": opp.get("urgency_reasons", []),
            "deadline": opp.get("deadline"),
            "raw_deadline": opp.get("raw_deadline"),
            "is_low_confidence": opp.get("is_low_confidence", False),
            "status": opp.get("status", "UNOPENED"),
            "action_status": opp.get("action_status", "ACTION_PENDING"),
            "summary": opp.get("summary"),
            "links": opp.get("links", []),
            "quick_replies": opp.get("quick_replies", []),
            "created_at": opp.get("created_at"),
            "updated_at": opp.get("updated_at")
        })

    return jsonify({"success": True, "count": len(results), "opportunities": results})

@opportunities_bp.route("/radar", methods=["GET"])
@token_required
def what_am_i_about_to_miss():
    """
    Dedicated triage view for 'What Am I About to Miss?' (PDF Section 14).
    Surfaces unopened important items, approaching deadlines (<48h), and high urgency.
    """
    db = get_db()
    user_id = request.user_id

    # Urgent criteria: urgency_score >= 60 OR status == 'UNOPENED' OR action_status == 'ACTION_PENDING'
    query = {
        "user_id": user_id,
        "status": {"$nin": ["COMPLETED", "DISMISSED"]},
        "$or": [
            {"urgency_score": {"$gte": 50}},
            {"status": "UNOPENED"}
        ]
    }

    urgent_opps = list(db.opportunities.find(query).sort("urgency_score", -1).limit(10))
    triage_items = []
    for opp in urgent_opps:
        triage_items.append({
            "id": str(opp["_id"]),
            "email_id": opp.get("email_id"),
            "title": opp.get("title"),
            "category": opp.get("category"),
            "urgency_score": opp.get("urgency_score", 0),
            "urgency_level": opp.get("urgency_level", "Normal"),
            "deadline": opp.get("deadline"),
            "status": opp.get("status"),
            "action_status": opp.get("action_status"),
            "summary": opp.get("summary"),
            "links": opp.get("links", [])
        })

    return jsonify({
        "success": True,
        "critical_count": len(triage_items),
        "items": triage_items
    })

@opportunities_bp.route("/<opp_id>", methods=["GET"])
@token_required
def get_opportunity(opp_id):
    """Retrieve details for single opportunity."""
    db = get_db()
    try:
        opp = db.opportunities.find_one({"_id": ObjectId(opp_id), "user_id": request.user_id})
    except Exception:
        return jsonify({"error": "Invalid ID format", "success": False}), 400

    if not opp:
        return jsonify({"error": "Opportunity not found", "success": False}), 404

    opp["id"] = str(opp["_id"])
    del opp["_id"]
    return jsonify({"success": True, "opportunity": opp})

@opportunities_bp.route("/<opp_id>/complete", methods=["POST"])
@token_required
def mark_completed(opp_id):
    """
    Mark opportunity as completed (PDF Section 11).
    All related reminders must stop immediately.
    """
    db = get_db()
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        opp = db.opportunities.find_one({"_id": ObjectId(opp_id), "user_id": request.user_id})
    except Exception:
        return jsonify({"error": "Invalid ID", "success": False}), 400

    if not opp:
        return jsonify({"error": "Opportunity not found", "success": False}), 404

    db.opportunities.update_one({"_id": opp["_id"]}, {
        "$set": {
            "status": "COMPLETED",
            "action_status": "COMPLETED",
            "urgency_score": 0,
            "urgency_level": "Normal",
            "completed_at": now_iso,
            "updated_at": now_iso
        }
    })

    # Stop all reminders
    stop_all_reminders_for_opportunity(opp_id, reason="User completed opportunity")
    log_audit(request.user_id, "OPPORTUNITY_COMPLETED", {"opp_id": opp_id})

    return jsonify({"success": True, "message": "Opportunity marked as completed. All reminders stopped."})

@opportunities_bp.route("/<opp_id>/snooze", methods=["POST"])
@token_required
def snooze_opportunity(opp_id):
    """
    Snooze reminders for this opportunity (e.g. 2 hours, 6 hours, 1 day).
    """
    data = request.get_json() or {}
    minutes = int(data.get("minutes", 120)) # default 2 hours

    db = get_db()
    now = datetime.now(timezone.utc)
    new_schedule = (now + timedelta(minutes=minutes)).isoformat()

    db.reminders.update_many(
        {"opportunity_id": opp_id, "status": "PENDING"},
        {"$set": {"schedule_time": new_schedule, "snoozed_until": new_schedule}}
    )

    return jsonify({"success": True, "message": f"Reminders snoozed for {minutes} minutes."})

@opportunities_bp.route("/<opp_id>/still-need-action", methods=["POST"])
@token_required
def still_need_action(opp_id):
    """Keep action pending while stopping unopened persistent reminders (PDF Section 11)."""
    db = get_db()
    now_iso = datetime.now(timezone.utc).isoformat()
    db.opportunities.update_one({"_id": ObjectId(opp_id), "user_id": request.user_id}, {
        "$set": {"action_status": "ACTION_PENDING", "status": "OPENED", "updated_at": now_iso}
    })
    stop_unread_reminders_for_opportunity(opp_id)
    return jsonify({"success": True, "message": "Action marked as pending. Deadline reminders remain active."})

@opportunities_bp.route("/<opp_id>/deadline", methods=["PUT"])
@token_required
def edit_deadline(opp_id):
    """User correction of extracted deadline (PDF Section 9)."""
    data = request.get_json() or {}
    new_deadline_str = data.get("deadline")
    if not new_deadline_str:
        return jsonify({"error": "Valid deadline date string is required", "success": False}), 400

    db = get_db()
    try:
        deadline_dt = datetime.fromisoformat(new_deadline_str.replace("Z", "+00:00"))
    except ValueError:
        return jsonify({"error": "Invalid ISO format for deadline", "success": False}), 400

    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    opp = db.opportunities.find_one({"_id": ObjectId(opp_id), "user_id": request.user_id})
    if not opp:
        return jsonify({"error": "Opportunity not found", "success": False}), 404

    # Recalculate risk score with updated deadline
    new_risk = calculate_risk_score(
        category=opp.get("category"),
        deadline_dt=deadline_dt,
        read_state=opp.get("status"),
        action_status=opp.get("action_status", "ACTION_PENDING"),
        is_completed=opp.get("status") == "COMPLETED",
        reminder_count=0,
        reference_now=now
    )

    db.opportunities.update_one({"_id": opp["_id"]}, {
        "$set": {
            "deadline": deadline_dt.isoformat(),
            "raw_deadline": data.get("raw_deadline") or new_deadline_str,
            "deadline_confidence": 1.0, # Confirmed by user
            "is_low_confidence": False,
            "urgency_score": new_risk["score"],
            "urgency_level": new_risk["level"],
            "urgency_reasons": new_risk["reasons"],
            "updated_at": now_iso
        }
    })

    return jsonify({"success": True, "message": "Deadline updated successfully.", "urgency_score": new_risk["score"]})

@opportunities_bp.route("/<opp_id>/calendar/google", methods=["GET"])
@token_required
def get_google_calendar_link(opp_id):
    """Generate 1-click Google Calendar URL for this opportunity."""
    db = get_db()
    opp = db.opportunities.find_one({"_id": ObjectId(opp_id), "user_id": request.user_id})
    if not opp or not opp.get("deadline"):
        return jsonify({"error": "Opportunity or deadline not available", "success": False}), 404

    deadline_dt = datetime.fromisoformat(opp["deadline"])
    link = opp.get("links", [{}])[0].get("url") if opp.get("links") else None
    cal_url = generate_google_calendar_url(opp.get("title"), opp.get("summary"), deadline_dt, link)

    return jsonify({"success": True, "google_calendar_url": cal_url})

@opportunities_bp.route("/<opp_id>/calendar/ics", methods=["GET"])
@token_required
def download_ics_file(opp_id):
    """Download RFC 5545 iCalendar file for this opportunity."""
    db = get_db()
    opp = db.opportunities.find_one({"_id": ObjectId(opp_id), "user_id": request.user_id})
    if not opp or not opp.get("deadline"):
        return jsonify({"error": "Opportunity or deadline not available", "success": False}), 404

    deadline_dt = datetime.fromisoformat(opp["deadline"])
    link = opp.get("links", [{}])[0].get("url") if opp.get("links") else None
    ics_text = generate_ics_content(opp.get("title"), opp.get("summary"), deadline_dt, link)

    filename = f"opportunity_{opp_id}.ics"
    return Response(
        ics_text,
        mimetype="text/calendar",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@opportunities_bp.route("/history", methods=["GET"])
@token_required
def get_missed_history():
    """Historical archive of expired / missed opportunities with neutral analysis (PDF Section 17)."""
    db = get_db()
    user_id = request.user_id

    cursor = db.opportunities.find({
        "user_id": user_id,
        "status": "EXPIRED"
    }).sort("updated_at", -1)

    missed = []
    for item in cursor:
        rem_count = db.reminders.count_documents({"opportunity_id": str(item["_id"]), "status": "SENT"})
        missed.append({
            "id": str(item["_id"]),
            "title": item.get("title"),
            "category": item.get("category"),
            "deadline": item.get("deadline"),
            "created_at": item.get("created_at"),
            "expired_at": item.get("expired_at"),
            "reminder_count": rem_count,
            "neutral_statement": item.get("missed_analysis") or "This opportunity reached its deadline without being marked completed."
        })

    return jsonify({"success": True, "count": len(missed), "history": missed})
