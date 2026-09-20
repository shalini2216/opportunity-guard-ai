from datetime import datetime, timezone, timedelta
from bson import ObjectId
from utils.db import get_db
from services.email_analyzer import analyze_email
from services.risk_engine import calculate_risk_score
from config import Config

def process_email_and_detect_opportunity(user_id: str, email_doc: dict, reference_now: datetime = None) -> dict:
    """
    Analyzes an email document and creates/updates an Opportunity record and initial reminders.
    """
    db = get_db()
    now = reference_now or datetime.now(timezone.utc)

    sender = email_doc.get("sender", "")
    subject = email_doc.get("subject", "")
    body = email_doc.get("body_text", "") or email_doc.get("snippet", "")

    # Run AI analysis
    analysis = analyze_email(sender, subject, body)

    # Check if category qualifies as an opportunity
    category = analysis["category"]
    deadline_iso = analysis["deadline_iso"]
    deadline_dt = datetime.fromisoformat(deadline_iso) if deadline_iso else None

    # Calculate initial risk score
    read_state = email_doc.get("read_state", "UNOPENED")
    risk_data = calculate_risk_score(
        category=category,
        deadline_dt=deadline_dt,
        read_state=read_state,
        action_status="ACTION_PENDING" if analysis["requires_action"] else "NONE",
        is_completed=False,
        reminder_count=0,
        reference_now=now
    )

    # Check if an opportunity for this email already exists
    existing_opp = db.opportunities.find_one({"user_id": user_id, "email_id": str(email_doc["_id"])})

    opp_data = {
        "user_id": user_id,
        "email_id": str(email_doc["_id"]),
        "title": subject,
        "sender": sender,
        "category": category,
        "is_important": analysis["is_important"],
        "requires_action": analysis["requires_action"],
        "status": read_state, # UNOPENED, OPENED, ACTION_PENDING, COMPLETED
        "action_status": "ACTION_PENDING" if analysis["requires_action"] else "NO_ACTION_REQUIRED",
        "deadline": deadline_iso,
        "raw_deadline": analysis["raw_deadline"],
        "deadline_confidence": analysis["deadline_confidence"],
        "is_low_confidence": analysis["is_low_confidence"],
        "urgency_score": risk_data["score"],
        "urgency_level": risk_data["level"],
        "urgency_reasons": risk_data["reasons"],
        "links": analysis["links"],
        "summary": analysis["summary"],
        "quick_replies": analysis.get("quick_replies", []),
        "updated_at": now.isoformat()
    }

    if existing_opp:
        db.opportunities.update_one({"_id": existing_opp["_id"]}, {"$set": opp_data})
        opp_id = existing_opp["_id"]
    else:
        opp_data["created_at"] = now.isoformat()
        res = db.opportunities.insert_one(opp_data)
        opp_id = res.inserted_id

    # If it is important and requires attention, schedule persistent reminders
    if analysis["is_important"] and read_state == "UNOPENED":
        _schedule_persistent_reminders(user_id, str(opp_id), subject, category, risk_data["level"], now)

    return {"opportunity_id": str(opp_id), "analysis": analysis, "risk": risk_data}

def _schedule_persistent_reminders(user_id: str, opp_id: str, title: str, category: str, urgency_level: str, start_time: datetime):
    """
    Schedule persistent escalation reminders: T+0, T+30m, T+2h, T+6h, T+12h
    """
    db = get_db()
    # Check if reminders already exist for this opportunity
    existing_count = db.reminders.count_documents({"opportunity_id": opp_id})
    if existing_count > 0:
        return

    intervals = Config.DEFAULT_ESCALATION_SCHEDULE_MINUTES # [0, 30, 120, 360, 720]
    reminders = []

    for step_idx, minutes in enumerate(intervals):
        schedule_time = start_time + timedelta(minutes=minutes)
        reminders.append({
            "user_id": user_id,
            "opportunity_id": opp_id,
            "title": title,
            "category": category,
            "urgency_level": urgency_level,
            "escalation_step": step_idx, # 0, 1, 2, 3, 4
            "minutes_offset": minutes,
            "type": "UNREAD_PERSISTENT",
            "schedule_time": schedule_time.isoformat(),
            "status": "PENDING" if step_idx > 0 else "SENT", # Step 0 fires immediately
            "sent_at": start_time.isoformat() if step_idx == 0 else None,
            "created_at": start_time.isoformat()
        })

    if reminders:
        db.reminders.insert_many(reminders)
        # Dispatch initial notification for Step 0
        db.notifications.insert_one({
            "user_id": user_id,
            "opportunity_id": opp_id,
            "title": f"New Important {category}: {title}",
            "message": f"A time-sensitive {category.lower()} was detected. Please review before deadlines approach.",
            "urgency_level": urgency_level,
            "status": "UNREAD",
            "created_at": start_time.isoformat()
        })
