import re
import json
import requests
from config import Config
from services.deadline_extractor import extract_deadline

URL_REGEX = re.compile(r'https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)')

CATEGORY_KEYWORDS = {
    "INTERVIEW": ["interview", "technical round", "hiring manager", "code pair", "candidate interview", "screening call"],
    "INTERNSHIP": ["internship", "intern", "summer 202", "fall intern", "co-op", "hackerrank assessment"],
    "EXAM": ["exam", "examination", "midterm", "proctored", "quiz", "test score", "final exam"],
    "JOB": ["job offer", "full-time position", "employment offer", "requisition", "role at", "welcome to the team"],
    "ASSIGNMENT": ["assignment", "homework", "problem set", "submission", "lab report", "canvas", "gradescope"],
    "REGISTRATION": ["registration closes", "course enrollment", "register for", "seat confirmation", "sign-up deadline"],
    "MEETING": ["sync", "meeting invite", "standup", "touchpoint", "calendar invite", "agenda for"],
    "COLLEGE": ["dean of", "university advisory", "provost", "campus notice", "department chair", "registrar"],
    "EVENT": ["hackathon", "webinar", "keynote", "workshop", "conference", "panel discussion"],
    "FINANCE": ["tuition", "invoice", "payment due", "billing statement", "stipend disbursement", "wire transfer"],
    "SECURITY": ["security alert", "suspicious sign-in", "reset your password", "verification code", "2fa authentication"]
}

def extract_links(text: str) -> list:
    """Extract actionable links and identify their link purpose."""
    if not text:
        return []
    
    found_urls = URL_REGEX.findall(text)
    unique_urls = list(dict.fromkeys(found_urls))
    
    extracted = []
    for url in unique_urls[:8]:
        label = "Action Portal"
        u_lower = url.lower()
        if "meet.google" in u_lower or "zoom.us" in u_lower or "teams.microsoft" in u_lower:
            label = "Video Meeting Link"
        elif "hackerrank" in u_lower or "codility" in u_lower or "codesignal" in u_lower or "leetcode" in u_lower:
            label = "Assessment Portal"
        elif "calendly" in u_lower or "calendar" in u_lower:
            label = "Scheduling Calendar"
        elif "form" in u_lower or "typeform" in u_lower or "docs.google.com/forms" in u_lower:
            label = "Registration Form"
        elif "github" in u_lower or "gitlab" in u_lower:
            label = "Code Repository"
        elif "canvas" in u_lower or "blackboard" in u_lower or "gradescope" in u_lower:
            label = "Course Portal"
        
        extracted.append({"url": url, "label": label})
    
    return extracted

def generate_quick_reply_suggestion(category: str, subject: str, deadline_str: str = None) -> dict:
    """Generate intelligent context-aware reply drafts."""
    drafts = []
    if category in ["INTERVIEW", "JOB"]:
        drafts.append({
            "title": "Accept & Confirm Attendance",
            "body": f"Thank you for the update regarding {subject}. I am pleased to confirm my availability and look forward to the session."
        })
        drafts.append({
            "title": "Request Time Slot Adjustment",
            "body": f"Thank you for reaching out regarding {subject}. Due to a prior academic commitment, could we please consider an alternate time window?"
        })
    elif category in ["EXAM", "ASSIGNMENT"]:
        drafts.append({
            "title": "Acknowledge & Confirm Submission",
            "body": f"Dear Professor / TA,\n\nI have reviewed the instructions for {subject} and will complete the requirements before the deadline."
        })
        drafts.append({
            "title": "Request 24h Extension",
            "body": f"Dear Professor,\n\nRegarding {subject}, I would like to respectfully inquire if a brief extension might be possible due to unforeseen circumstances."
        })
    elif category == "REGISTRATION":
        drafts.append({
            "title": "Confirm Registration",
            "body": f"I have submitted the required details for {subject}. Please let me know if any additional documentation is needed."
        })
    else:
        drafts.append({
            "title": "Acknowledge Receipt",
            "body": f"Thank you for the communication regarding {subject}. I have received this and will take appropriate action promptly."
        })
    return drafts

def analyze_email_deterministic(sender: str, subject: str, body: str) -> dict:
    """Deterministic NLP analysis fallback with confidence scoring."""
    combined_text = f"{subject}\n{body}"
    lower_text = combined_text.lower()

    # Determine category
    detected_category = "GENERAL"
    highest_hits = 0

    for cat, keywords in CATEGORY_KEYWORDS.items():
        hits = sum(1 for kw in keywords if kw in lower_text)
        if hits > highest_hits:
            highest_hits = hits
            detected_category = cat

    # Filter out pure promotional/spam
    is_promo = any(promo in lower_text for promo in ["unsubscribe", "sale ends", "newsletter", "% off", "discount code", "click to shop"])
    is_important = highest_hits > 0 or any(kw in lower_text for kw in ["deadline", "urgent", "action required", "important", "expires", "scheduled"])

    if is_promo and highest_hits == 0:
        detected_category = "OTHER"
        is_important = False

    # Extract deadline
    deadline_info = extract_deadline(combined_text)

    # Extract links
    links = extract_links(body)

    # Requires action if deadline exists or actionable keywords present
    requires_action = bool(
        deadline_info["deadline_iso"] or 
        any(act in lower_text for act in ["complete", "submit", "register", "confirm", "respond", "action required", "reply", "attend"])
    ) and is_important

    # Generate summary
    action_text = "Review communication and respond accordingly."
    if requires_action:
        if deadline_info["raw_extracted"]:
            action_text = f"Complete required action before {deadline_info['raw_extracted']}."
        else:
            action_text = "Requires active response or action submission."

    summary = f"Notice regarding {detected_category.lower()}: {subject.strip()}. {action_text}"
    quick_drafts = generate_quick_reply_suggestion(detected_category, subject, deadline_info.get("raw_extracted"))

    return {
        "category": detected_category,
        "is_important": is_important,
        "requires_action": requires_action,
        "deadline_iso": deadline_info["deadline_iso"],
        "raw_deadline": deadline_info["raw_extracted"],
        "deadline_confidence": deadline_info["confidence"],
        "is_low_confidence": deadline_info["is_low_confidence"],
        "links": links,
        "summary": summary,
        "quick_replies": quick_drafts,
        "analysis_engine": "deterministic_nlp",
        "confidence": 0.88 if highest_hits >= 2 else (0.75 if highest_hits == 1 else 0.50)
    }

def analyze_email_with_gemini(sender: str, subject: str, body: str) -> dict:
    """Optional LLM analysis using Gemini REST endpoint when API key is provided."""
    if not Config.GEMINI_API_KEY:
        return None

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={Config.GEMINI_API_KEY}"
        prompt = f"""
You are OpportunityGuard AI analyzer. Analyze this incoming email:
Sender: {sender}
Subject: {subject}
Body: {body[:2500]}

Return STRICT JSON with these exact keys:
{{
  "category": "One of EXAM, INTERNSHIP, JOB, INTERVIEW, MEETING, ASSIGNMENT, REGISTRATION, COLLEGE, EVENT, FINANCE, SECURITY, GENERAL, OTHER",
  "is_important": boolean,
  "requires_action": boolean,
  "summary": "1-2 sentence concise summary: what happened, action required, and deadline",
  "confidence": float between 0.0 and 1.0
}}
"""
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"}
        }
        res = requests.post(url, json=payload, timeout=8)
        if res.status_code == 200:
            result_json = res.json()
            text_resp = result_json["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(text_resp)

            # Validate outputs server-side (PDF Requirement 26)
            valid_category = parsed.get("category", "GENERAL").upper()
            if valid_category not in Config.CATEGORIES:
                valid_category = "GENERAL"

            deterministic_fallback = analyze_email_deterministic(sender, subject, body)
            return {
                "category": valid_category,
                "is_important": bool(parsed.get("is_important", True)),
                "requires_action": bool(parsed.get("requires_action", True)),
                "deadline_iso": deterministic_fallback["deadline_iso"],
                "raw_deadline": deterministic_fallback["raw_deadline"],
                "deadline_confidence": deterministic_fallback["deadline_confidence"],
                "is_low_confidence": deterministic_fallback["is_low_confidence"],
                "links": deterministic_fallback["links"],
                "summary": parsed.get("summary") or deterministic_fallback["summary"],
                "quick_replies": deterministic_fallback["quick_replies"],
                "analysis_engine": "gemini_hybrid",
                "confidence": float(parsed.get("confidence", 0.92))
            }
    except Exception as e:
        print(f"Gemini API analysis exception: {e}. Falling back to deterministic NLP.")

    return None

def analyze_email(sender: str, subject: str, body: str) -> dict:
    """Unified email analysis pipeline with automated fallback."""
    if Config.GEMINI_API_KEY:
        llm_result = analyze_email_with_gemini(sender, subject, body)
        if llm_result:
            return llm_result
    return analyze_email_deterministic(sender, subject, body)
