from datetime import datetime, timezone, timedelta
from bson import ObjectId
from utils.db import get_db
from services.risk_engine import calculate_risk_score

def is_within_quiet_hours(user_settings: dict, check_time: datetime) -> bool:
    """Check if current time falls within user's configured quiet hours."""
    quiet_enabled = user_settings.get("quiet_hours_enabled", True)
    if not quiet_enabled:
        return False

    q_start = user_settings.get("quiet_hours_start", "22:00")
    q_end = user_settings.get("quiet_hours_end", "07:00")

    try:
        start_h, start_m = map(int, q_start.split(":"))
        end_h, end_m = map(int, q_end.split(":"))

        current_minutes = check_time.hour * 60 + check_time.minute
        start_minutes = start_h * 60 + start_m
        end_minutes = end_h * 60 + end_m

        if start_minutes > end_minutes:
            # Over midnight (e.g. 22:00 to 07:00)
            return current_minutes >= start_minutes or current_minutes < end_minutes
        else:
            return start_minutes <= current_minutes < end_minutes
    except Exception:
        return False

def run_reminder_check_cycle(reference_now: datetime = None) -> dict:
    """
    Core reminder engine cycle executed by APScheduler or triggered manually in Demo Mode.
    Evaluates pending reminders, user stop conditions, quiet hours, and deadline alerts.
    """
    db = get_db()
    now = reference_now or datetime.now(timezone.utc)
    now_iso = now.isoformat()

    stats = {
        "reminders_processed": 0,
        "notifications_sent": 0,
        "reminders_stopped": 0,
        "reminders_delayed_quiet_hours": 0,
        "opportunities_expired": 0
    }

    # 1. Process pending reminders scheduled for <= now
    pending_reminders = list(db.reminders.find({
        "status": "PENDING",
        "schedule_time": {"$lte": now_iso}
    }))

    for rem in pending_reminders:
        stats["reminders_processed"] += 1
        opp_id = rem.get("opportunity_id")
        user_id = rem.get("user_id")

        opp = db.opportunities.find_one({"_id": ObjectId(opp_id)})
        if not opp:
            db.reminders.update_one({"_id": rem["_id"]}, {"$set": {"status": "STOPPED", "stop_reason": "Opportunity not found"}})
            stats["reminders_stopped"] += 1
            continue

        # Check terminal states
        if opp.get("status") in ["COMPLETED", "DISMISSED", "EXPIRED"]:
            db.reminders.update_one({"_id": rem["_id"]}, {"$set": {"status": "STOPPED", "stop_reason": f"Opportunity is {opp.get('status')}"}})
            stats["reminders_stopped"] += 1
            continue

        # Check unread persistent stop condition (PDF Section 7 & 12)
        # If reminder is UNREAD_PERSISTENT, but email has been opened, STOP reminder!
        if rem.get("type") == "UNREAD_PERSISTENT":
            if opp.get("status") in ["OPENED", "ACKNOWLEDGED", "ACTION_PENDING"]:
                db.reminders.update_one({"_id": rem["_id"]}, {"$set": {"status": "STOPPED", "stop_reason": "Email already opened by user"}})
                stats["reminders_stopped"] += 1
                continue

        # Check user settings
        user = db.users.find_one({"_id": ObjectId(user_id)})
        user_settings = (user or {}).get("settings", {})

        # Quiet hours check
        if is_within_quiet_hours(user_settings, now):
            # Reschedule 30 minutes forward
            next_time = (now + timedelta(minutes=30)).isoformat()
            db.reminders.update_one({"_id": rem["_id"]}, {"$set": {"schedule_time": next_time}})
            stats["reminders_delayed_quiet_hours"] += 1
            continue

        # Category filtering check
        user_priority_cats = user_settings.get("priority_categories", [])
        if user_priority_cats and opp.get("category") not in user_priority_cats:
            db.reminders.update_one({"_id": rem["_id"]}, {"$set": {"status": "STOPPED", "stop_reason": "Category not in user priority preferences"}})
            stats["reminders_stopped"] += 1
            continue

        # Fire notification
        step = rem.get("escalation_step", 0)
        offset = rem.get("minutes_offset", 0)
        urgency = rem.get("urgency_level", "High")
        title = rem.get("title", "Important Item")
        cat = rem.get("category", "OPPORTUNITY")

        if rem.get("type") == "DEADLINE_APPROACHING":
            notif_msg = f"CRITICAL: Deadline approaching for {cat} ({title})! Action remains pending."
            urgency = "Critical"
        else:
            notif_msg = f"Reminder (Escalation +{offset}m): You have an unopened time-sensitive {cat} email: '{title}'"

        db.notifications.insert_one({
            "user_id": user_id,
            "opportunity_id": opp_id,
            "title": f"Opportunity Alert: {cat}",
            "message": notif_msg,
            "urgency_level": urgency,
            "status": "UNREAD",
            "escalation_step": step,
            "created_at": now_iso
        })

        db.reminders.update_one({"_id": rem["_id"]}, {
            "$set": {
                "status": "SENT",
                "sent_at": now_iso
            }
        })
        stats["notifications_sent"] += 1

        # Recalculate opportunity urgency score reflecting higher escalation
        deadline_dt = datetime.fromisoformat(opp["deadline"]) if opp.get("deadline") else None
        new_risk = calculate_risk_score(
            category=opp.get("category"),
            deadline_dt=deadline_dt,
            read_state=opp.get("status"),
            action_status=opp.get("action_status", "ACTION_PENDING"),
            is_completed=opp.get("status") == "COMPLETED",
            reminder_count=step + 1,
            reference_now=now
        )
        db.opportunities.update_one({"_id": opp["_id"]}, {
            "$set": {
                "urgency_score": new_risk["score"],
                "urgency_level": new_risk["level"],
                "urgency_reasons": new_risk["reasons"],
                "updated_at": now_iso
            }
        })

    # 2. Check for passed deadlines & mark EXPIRED (PDF Section 17)
    expired_cursor = db.opportunities.find({
        "status": {"$nin": ["COMPLETED", "DISMISSED", "EXPIRED"]},
        "deadline": {"$ne": None, "$lt": now_iso}
    })
    for exp_opp in expired_cursor:
        db.opportunities.update_one({"_id": exp_opp["_id"]}, {
            "$set": {
                "status": "EXPIRED",
                "urgency_score": 100,
                "urgency_level": "Critical",
                "expired_at": now_iso,
                "missed_analysis": "This opportunity reached its deadline without being marked completed.",
                "updated_at": now_iso
            }
        })
        stop_all_reminders_for_opportunity(str(exp_opp["_id"]), reason="Deadline Expired")
        stats["opportunities_expired"] += 1

    return stats

def stop_unread_reminders_for_opportunity(opp_id: str):
    """
    Stops all pending UNREAD_PERSISTENT reminders when user opens/reads an email.
    If action is still pending, schedule deadline approaching reminder.
    """
    db = get_db()
    db.reminders.update_many(
        {"opportunity_id": opp_id, "type": "UNREAD_PERSISTENT", "status": "PENDING"},
        {"$set": {"status": "STOPPED", "stop_reason": "Email opened by user"}}
    )

    opp = db.opportunities.find_one({"_id": ObjectId(opp_id)})
    if opp and opp.get("deadline") and opp.get("action_status") == "ACTION_PENDING":
        # Schedule deadline reminder 2 hours prior to deadline
        try:
            deadline_dt = datetime.fromisoformat(opp["deadline"])
            remind_time = deadline_dt - timedelta(hours=2)
            now = datetime.now(timezone.utc)
            if remind_time > now:
                db.reminders.insert_one({
                    "user_id": opp["user_id"],
                    "opportunity_id": opp_id,
                    "title": opp.get("title"),
                    "category": opp.get("category"),
                    "urgency_level": "Critical",
                    "escalation_step": 99,
                    "minutes_offset": 0,
                    "type": "DEADLINE_APPROACHING",
                    "schedule_time": remind_time.isoformat(),
                    "status": "PENDING",
                    "created_at": now.isoformat()
                })
        except Exception as e:
            print(f"Error scheduling deadline reminder: {e}")

def stop_all_reminders_for_opportunity(opp_id: str, reason: str = "Completed"):
    """Stop all active reminders for this opportunity (e.g. marked completed or dismissed)."""
    db = get_db()
    db.reminders.update_many(
        {"opportunity_id": opp_id, "status": "PENDING"},
        {"$set": {"status": "STOPPED", "stop_reason": reason}}
    )
