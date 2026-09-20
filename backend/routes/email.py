from flask import Blueprint, request, jsonify, redirect
from datetime import datetime, timezone
from bson import ObjectId
from utils.db import get_db
from utils.security import token_required, log_audit
from services.gmail_service import (
    get_authorization_url, 
    disconnect_account, 
    sync_gmail_via_imap, 
    sync_messages_via_oauth, 
    exchange_code_and_store_account
)
from services.reminder_engine import stop_unread_reminders_for_opportunity, stop_all_reminders_for_opportunity
from services.risk_engine import calculate_risk_score

email_bp = Blueprint("email", __name__)

@email_bp.route("", methods=["GET"])
@token_required
def list_emails():
    """List emails belonging to authenticated user with filtering."""
    db = get_db()
    user_id = request.user_id

    query = {"user_id": user_id}
    read_state = request.args.get("read_state")
    if read_state:
        query["read_state"] = read_state.upper()

    category = request.args.get("category")
    if category:
        query["category"] = category.upper()

    search = request.args.get("search")
    if search:
        query["$or"] = [
            {"subject": {"$regex": search, "$options": "i"}},
            {"sender": {"$regex": search, "$options": "i"}},
            {"snippet": {"$regex": search, "$options": "i"}}
        ]

    emails_cursor = db.emails.find(query).sort("received_at", -1).limit(100)
    emails = []
    for e in emails_cursor:
        emails.append({
            "id": str(e["_id"]),
            "provider_id": e.get("provider_id"),
            "sender": e.get("sender"),
            "subject": e.get("subject"),
            "snippet": e.get("snippet"),
            "received_at": e.get("received_at"),
            "read_state": e.get("read_state", "UNOPENED"),
            "category": e.get("category", "GENERAL"),
            "is_important": e.get("is_important", False),
            "requires_action": e.get("requires_action", False),
            "opportunity_id": e.get("opportunity_id"),
            "source": e.get("source", "system")
        })

    return jsonify({"success": True, "count": len(emails), "emails": emails})

@email_bp.route("/account", methods=["GET"])
@token_required
def get_email_account_status():
    """Retrieve connected mailbox account information."""
    db = get_db()
    account = db.email_accounts.find_one({"user_id": request.user_id, "status": "CONNECTED"})
    if not account:
        return jsonify({"success": True, "connected": False})

    return jsonify({
        "success": True,
        "connected": True,
        "email_address": account.get("email_address"),
        "provider": account.get("provider"),
        "connected_at": account.get("connected_at"),
        "last_synced_at": account.get("last_synced_at")
    })

@email_bp.route("/connect-imap", methods=["POST"])
@token_required
def connect_gmail_imap():
    """
    Direct Gmail Connection via App Password & IMAP.
    Allows real mailbox sync instantly without Google Cloud OAuth consent setup.
    """
    data = request.get_json() or {}
    email_address = data.get("email_address", "").strip()
    app_password = data.get("app_password", "").strip()

    if not email_address or not app_password:
        return jsonify({"error": "Gmail address and App Password are required", "success": False}), 400

    result = sync_gmail_via_imap(request.user_id, email_address, app_password)
    if "error" in result:
        return jsonify({"error": result["error"], "success": False}), 400

    log_audit(request.user_id, "GMAIL_IMAP_CONNECTED", {"email": email_address})
    return jsonify(result)

@email_bp.route("/connect", methods=["POST"])
@token_required
def connect_email():
    """Initiate Gmail OAuth connection flow."""
    auth_data = get_authorization_url()
    return jsonify({"success": True, "auth_url": auth_data.get("url"), "error": auth_data.get("error")})

@email_bp.route("/oauth/callback", methods=["GET"])
def oauth_callback():
    """Handle Google OAuth2 redirect callback."""
    code = request.args.get("code")
    state = request.args.get("state")
    if not code:
        return "Authentication authorization code missing", 400

    # In single-user / current user flow, or state-based flow
    db = get_db()
    # Find most recently active user or fallback to state
    user = db.users.find_one(sort=[("last_login", -1)])
    if not user:
        return "No user found to associate with Gmail", 400

    user_id = str(user["_id"])
    res = exchange_code_and_store_account(user_id, code)
    if "error" in res:
        return f"OAuth Exchange failed: {res['error']}", 400

    log_audit(user_id, "GMAIL_OAUTH_CONNECTED", {"email": res.get("email_address")})
    # Redirect back to frontend dashboard
    return redirect("http://localhost:5173/dashboard?gmail_connected=true")

@email_bp.route("/disconnect", methods=["POST"])
@token_required
def disconnect_email():
    """Disconnect Gmail and purge credentials."""
    res = disconnect_account(request.user_id)
    log_audit(request.user_id, "EMAIL_DISCONNECT")
    return jsonify(res)

@email_bp.route("/sync", methods=["POST"])
@token_required
def sync_email():
    """Trigger mailbox synchronization for whatever account is connected."""
    db = get_db()
    account = db.email_accounts.find_one({"user_id": request.user_id, "status": "CONNECTED"})
    if not account:
        return jsonify({
            "success": False,
            "message": "No live email account connected. Please connect your Gmail via App Password or OAuth."
        }), 200

    provider = account.get("provider")
    if provider == "gmail_imap":
        email_addr = account.get("email_address")
        app_pw = account.get("app_password")
        res = sync_gmail_via_imap(request.user_id, email_addr, app_pw)
        return jsonify(res)
    elif provider == "google_oauth":
        res = sync_messages_via_oauth(request.user_id)
        return jsonify(res)

    return jsonify({"success": False, "message": "Unknown account provider"})

@email_bp.route("/<email_id>", methods=["GET"])
@token_required
def get_email_details(email_id):
    """Fetch single email details and associated Opportunity record."""
    db = get_db()
    user_id = request.user_id

    try:
        e = db.emails.find_one({"_id": ObjectId(email_id), "user_id": user_id})
    except Exception:
        return jsonify({"error": "Invalid email ID format", "success": False}), 400

    if not e:
        return jsonify({"error": "Email not found", "success": False}), 404

    # Automatically transition UNOPENED -> OPENED on viewing
    if e.get("read_state") == "UNOPENED":
        now_iso = datetime.now(timezone.utc).isoformat()
        db.emails.update_one({"_id": e["_id"]}, {"$set": {"read_state": "OPENED", "opened_at": now_iso}})
        e["read_state"] = "OPENED"
        e["opened_at"] = now_iso

        # Update associated opportunity and halt unread reminders!
        opp = db.opportunities.find_one({"email_id": str(e["_id"])})
        if opp:
            db.opportunities.update_one({"_id": opp["_id"]}, {
                "$set": {
                    "status": "OPENED",
                    "action_status": "ACTION_PENDING" if opp.get("requires_action") else "NO_ACTION",
                    "updated_at": now_iso
                }
            })
            stop_unread_reminders_for_opportunity(str(opp["_id"]))

    opp = db.opportunities.find_one({"email_id": str(e["_id"])})
    opp_dict = None
    if opp:
        opp_dict = {
            "id": str(opp["_id"]),
            "title": opp.get("title"),
            "category": opp.get("category"),
            "urgency_score": opp.get("urgency_score"),
            "urgency_level": opp.get("urgency_level"),
            "urgency_reasons": opp.get("urgency_reasons", []),
            "deadline": opp.get("deadline"),
            "raw_deadline": opp.get("raw_deadline"),
            "is_low_confidence": opp.get("is_low_confidence", False),
            "status": opp.get("status"),
            "action_status": opp.get("action_status"),
            "summary": opp.get("summary"),
            "links": opp.get("links", []),
            "quick_replies": opp.get("quick_replies", [])
        }

    return jsonify({
        "success": True,
        "email": {
            "id": str(e["_id"]),
            "sender": e.get("sender"),
            "subject": e.get("subject"),
            "body_text": e.get("body_text", e.get("snippet", "")),
            "snippet": e.get("snippet"),
            "received_at": e.get("received_at"),
            "read_state": e.get("read_state"),
            "opened_at": e.get("opened_at"),
            "category": e.get("category"),
            "is_important": e.get("is_important")
        },
        "opportunity": opp_dict
    })

@email_bp.route("/<email_id>/state", methods=["PUT"])
@token_required
def update_email_state(email_id):
    """Update email state: UNOPENED -> OPENED -> ACKNOWLEDGED -> ACTION_PENDING -> COMPLETED."""
    data = request.get_json() or {}
    new_state = (data.get("state") or "").upper()
    valid_states = ["UNOPENED", "OPENED", "ACKNOWLEDGED", "ACTION_PENDING", "COMPLETED", "DISMISSED"]

    if new_state not in valid_states:
        return jsonify({"error": f"Invalid state. Must be one of {valid_states}", "success": False}), 400

    db = get_db()
    user_id = request.user_id

    try:
        e = db.emails.find_one({"_id": ObjectId(email_id), "user_id": user_id})
    except Exception:
        return jsonify({"error": "Invalid email ID", "success": False}), 400

    if not e:
        return jsonify({"error": "Email not found", "success": False}), 404

    now_iso = datetime.now(timezone.utc).isoformat()
    db.emails.update_one({"_id": e["_id"]}, {"$set": {"read_state": new_state, "updated_at": now_iso}})

    opp = db.opportunities.find_one({"email_id": str(e["_id"])})
    if opp:
        opp_updates = {"status": new_state, "updated_at": now_iso}
        if new_state == "OPENED":
            opp_updates["action_status"] = "ACTION_PENDING"
            stop_unread_reminders_for_opportunity(str(opp["_id"]))
        elif new_state == "COMPLETED":
            opp_updates["action_status"] = "COMPLETED"
            stop_all_reminders_for_opportunity(str(opp["_id"]), reason="User marked as completed")
        elif new_state == "DISMISSED":
            opp_updates["action_status"] = "DISMISSED"
            stop_all_reminders_for_opportunity(str(opp["_id"]), reason="User dismissed opportunity")

        db.opportunities.update_one({"_id": opp["_id"]}, {"$set": opp_updates})

    return jsonify({"success": True, "state": new_state, "message": f"State updated to {new_state}"})
