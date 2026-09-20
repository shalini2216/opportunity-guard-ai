from flask import Blueprint, request, jsonify
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from utils.db import get_db
from utils.security import token_required, log_audit
from services.opportunity_detector import process_email_and_detect_opportunity
from services.reminder_engine import run_reminder_check_cycle

demo_bp = Blueprint("demo", __name__)

SAMPLE_DEMO_EMAILS = [
    {
        "provider_id": "demo_gs_intern_001",
        "sender": "goldman-sachs-campus@recruiting.gs.com",
        "subject": "Action Required: Complete Your Engineering Analyst Online Assessment within 48 hours",
        "snippet": "Thank you for applying for the Summer Analyst Program. Your coding assessment is now active on HackerRank...",
        "body_text": """Dear Candidate,

Thank you for your application to the 2026 Summer Analyst Internship Program at Goldman Sachs.

Your HackerRank technical assessment is now ready. You are required to complete this assessment within 48 hours.
Assessment link: https://hackerrank.com/gs-intern-assessment-2026

Please ensure you have an uninterrupted 90-minute window before starting. Failure to complete the assessment before the deadline will result in your application being closed.

Best regards,
Campus Recruiting Team
Goldman Sachs""",
        "received_minutes_ago": 5
    },
    {
        "provider_id": "demo_google_interview_002",
        "sender": "interviews@google.com",
        "subject": "Google Software Engineering Interview: Confirm Slot by tomorrow at 5 PM",
        "snippet": "We would like to invite you to the upcoming technical interview round with a Senior Software Engineer...",
        "body_text": """Hi,

We were impressed by your background and would like to schedule your Google Technical Interview round!

Please confirm your preferred time slot by tomorrow at 5 PM:
Scheduling Portal: https://calendly.com/google-recruiting/swe-screen
Google Meet Room: https://meet.google.com/xyz-test-abc

If you require any accommodations or have questions regarding the interview format, please reply directly to this email.

Best,
The Google Recruitment Team""",
        "received_minutes_ago": 15
    },
    {
        "provider_id": "demo_registrar_003",
        "sender": "registrar@university.edu",
        "subject": "URGENT: Fall Semester Course Registration Closes Friday at 11:59 PM",
        "snippet": "This is a final advisory that course enrollment for the upcoming academic semester will strictly close this Friday...",
        "body_text": """Official University Notice:

All undergraduate and graduate students must finalize their registered course schedule.
Registration closes this Friday at 11:59 PM.

Please access your student portal immediately:
https://portal.university.edu/student-records

Unenrolled students will forfeit their priority laboratory access and will incur a $150 late fee.

Office of the Registrar
University Student Services""",
        "received_minutes_ago": 60
    },
    {
        "provider_id": "demo_cs401_assignment_004",
        "sender": "prof.turner@cs.university.edu",
        "subject": "CS401 Final Project Deliverable: Submission due Sunday at midnight",
        "snippet": "Reminder regarding your final capstone deliverable. Submission is due Sunday at midnight on Gradescope...",
        "body_text": """CS401 Students,

Please remember that your Phase 2 Deliverable and architecture documentation is due Sunday at midnight.
Submissions must be made via Gradescope:
https://www.gradescope.com/courses/cs401

Make sure all unit tests pass before your final commit. Late submissions will receive a 10% penalty per day.

Prof. Turner""",
        "received_minutes_ago": 120
    },
    {
        "provider_id": "demo_sprint_meeting_005",
        "sender": "alex.lead@techcorp.io",
        "subject": "Architecture Review & Team Sprint Sync: scheduled for Monday at 10 AM",
        "snippet": "Sync meeting to review high-level designs and task allocations for Sprint 14...",
        "body_text": """Team,

Our sprint planning and quarterly architecture sync is scheduled for Monday at 10 AM.
Zoom link: https://zoom.us/j/987654321

Please review the engineering RFC beforehand so we can make quick decisions.

Alex""",
        "received_minutes_ago": 240
    },
    {
        "provider_id": "demo_newsletter_006",
        "sender": "weekly@clouddigest.io",
        "subject": "Cloud Digest #88: Microservices vs Monoliths in 2026",
        "snippet": "Read our latest articles on container orchestration and serverless cost optimizations...",
        "body_text": """Welcome to Cloud Digest!

In this issue:
- Why teams are reconsidering distributed monoliths
- Kubernetes tips for small engineering teams
- Top 10 open source tools this month

Click here to unsubscribe or change newsletter preferences.""",
        "received_minutes_ago": 500
    },
    {
        "provider_id": "demo_promo_007",
        "sender": "deals@gearstore.com",
        "subject": "48-Hour Weekend Flash Sale: 40% Off Mechanical Keyboards",
        "snippet": "Upgrade your desk setup with our premium ergonomic mechanical keyboards...",
        "body_text": """Don't miss our flash sale! Use code SPRING40 at checkout to save 40% on all keyboards and desk mats. Offer valid while supplies last. Unsubscribe here.""",
        "received_minutes_ago": 700
    }
]

@demo_bp.route("/seed", methods=["POST"])
@token_required
def seed_demo_data():
    """
    Populate user account with realistic sample demo emails and trigger automatic
    opportunity analysis, risk scoring, and persistent reminder generation.
    """
    db = get_db()
    user_id = request.user_id
    now = datetime.now(timezone.utc)

    # Clean previous demo items for clean demonstration
    db.emails.delete_many({"user_id": user_id, "provider_id": {"$regex": "^demo_"}})
    db.opportunities.delete_many({"user_id": user_id})
    db.reminders.delete_many({"user_id": user_id})
    db.notifications.delete_many({"user_id": user_id})

    created_emails = []
    created_opps = []

    for item in SAMPLE_DEMO_EMAILS:
        received_at = (now - timedelta(minutes=item["received_minutes_ago"])).isoformat()
        email_doc = {
            "user_id": user_id,
            "provider_id": item["provider_id"],
            "sender": item["sender"],
            "subject": item["subject"],
            "snippet": item["snippet"],
            "body_text": item["body_text"],
            "received_at": received_at,
            "read_state": "UNOPENED",
            "is_demo": True
        }

        res = db.emails.insert_one(email_doc)
        email_doc["_id"] = res.inserted_id
        created_emails.append(str(res.inserted_id))

        # Run opportunity detector
        detection = process_email_and_detect_opportunity(user_id, email_doc, reference_now=now)
        if detection.get("opportunity_id"):
            created_opps.append(detection["opportunity_id"])

    log_audit(user_id, "DEMO_DATA_SEEDED", {"emails_count": len(created_emails), "opps_count": len(created_opps)})

    return jsonify({
        "success": True,
        "message": "Demo mode successfully initialized with realistic emails and detected opportunities.",
        "seeded_emails": len(created_emails),
        "detected_opportunities": len(created_opps)
    })

@demo_bp.route("/fast-forward", methods=["POST"])
@token_required
def fast_forward_time():
    """
    Simulates the passage of time (e.g. +30 mins, +2 hours, +6 hours, +12 hours)
    and executes the persistent reminder engine cycle live.
    This fulfills the requirement to demonstrate:
    unopened -> reminders continue -> open -> reminders stop.
    """
    data = request.get_json() or {}
    minutes_forward = int(data.get("minutes", 30))

    db = get_db()
    user_id = request.user_id

    # Find pending reminders for this user
    # Advance their schedule_time back by minutes_forward to simulate time passing forward!
    pending_rems = list(db.reminders.find({"user_id": user_id, "status": "PENDING"}))
    for r in pending_rems:
        try:
            curr_sched = datetime.fromisoformat(r["schedule_time"])
            advanced_sched = (curr_sched - timedelta(minutes=minutes_forward)).isoformat()
            db.reminders.update_one({"_id": r["_id"]}, {"$set": {"schedule_time": advanced_sched}})
        except Exception:
            pass

    # Execute check cycle
    now = datetime.now(timezone.utc)
    cycle_stats = run_reminder_check_cycle(reference_now=now)

    log_audit(user_id, "DEMO_FAST_FORWARD", {"minutes": minutes_forward, "cycle_stats": cycle_stats})

    return jsonify({
        "success": True,
        "message": f"Simulation advanced by {minutes_forward} minutes. Escalation evaluated.",
        "stats": cycle_stats
    })

@demo_bp.route("/trigger-email", methods=["POST"])
@token_required
def trigger_urgent_email():
    """Simulate receiving a brand-new urgent email right now."""
    data = request.get_json() or {}
    db = get_db()
    user_id = request.user_id
    now = datetime.now(timezone.utc)

    custom_subject = data.get("subject") or "URGENT: Invitation for Meta Final Technical Interview - Slot Confirmation required in 24 hours"
    custom_body = data.get("body") or f"""Hello Candidate,

You have been selected for the final interview round for the Software Engineer position.
Please confirm your interview attendance within 24 hours:
Meeting Link: https://meet.google.com/meta-final-interview
Assessment Dashboard: https://recruiting.meta.com/candidate-portal

Best regards,
Meta Recruiting"""

    email_doc = {
        "user_id": user_id,
        "provider_id": f"demo_live_{int(now.timestamp())}",
        "sender": data.get("sender") or "recruiting@meta.com",
        "subject": custom_subject,
        "snippet": custom_body[:150] + "...",
        "body_text": custom_body,
        "received_at": now.isoformat(),
        "read_state": "UNOPENED",
        "is_demo": True
    }

    res = db.emails.insert_one(email_doc)
    email_doc["_id"] = res.inserted_id

    detection = process_email_and_detect_opportunity(user_id, email_doc, reference_now=now)
    log_audit(user_id, "DEMO_TRIGGER_EMAIL", {"subject": custom_subject})

    return jsonify({
        "success": True,
        "message": "New urgent email received and analyzed by OpportunityGuard AI.",
        "email_id": str(email_doc["_id"]),
        "opportunity_id": detection.get("opportunity_id"),
        "analysis": detection.get("analysis")
    })

@demo_bp.route("/reset", methods=["POST"])
@token_required
def reset_demo():
    """Reset all user data and reseed."""
    return seed_demo_data()
