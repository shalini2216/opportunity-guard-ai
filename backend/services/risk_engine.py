from datetime import datetime, timezone

CATEGORY_WEIGHTS = {
    "EXAM": 35,
    "INTERVIEW": 35,
    "JOB": 30,
    "INTERNSHIP": 30,
    "ASSIGNMENT": 25,
    "REGISTRATION": 25,
    "FINANCE": 22,
    "SECURITY": 20,
    "MEETING": 18,
    "COLLEGE": 15,
    "EVENT": 12,
    "GENERAL": 8,
    "OTHER": 5
}

def calculate_risk_score(
    category: str,
    deadline_dt: datetime = None,
    read_state: str = "UNOPENED",
    action_status: str = "ACTION_PENDING",
    is_completed: bool = False,
    reminder_count: int = 0,
    reference_now: datetime = None
) -> dict:
    """
    Calculate 0-100 Opportunity Urgency & Risk Indicator.
    Returns:
    {
        "score": int (0-100),
        "level": str ("Critical" | "High" | "Medium" | "Low" | "Normal"),
        "reasons": list[str]
    }
    """
    if is_completed or action_status == "COMPLETED":
        return {
            "score": 0,
            "level": "Normal",
            "reasons": ["Opportunity marked as completed."]
        }

    now = reference_now or datetime.now(timezone.utc)
    reasons = []

    # 1. Base category weight
    cat_upper = (category or "GENERAL").upper()
    cat_weight = CATEGORY_WEIGHTS.get(cat_upper, 10)
    reasons.append(f"Category weight ({cat_upper}): +{cat_weight}")

    # 2. Read State penalty
    read_penalty = 0
    state_upper = (read_state or "UNOPENED").upper()
    if state_upper == "UNOPENED":
        read_penalty = 25
        reasons.append("Email remains unopened: +25")
    elif action_status == "ACTION_PENDING":
        read_penalty = 15
        reasons.append("Opened but action still pending: +15")
    elif state_upper == "ACKNOWLEDGED":
        read_penalty = 8
        reasons.append("Acknowledged by user: +8")

    # 3. Deadline Proximity calculation
    proximity_score = 0
    if deadline_dt:
        if deadline_dt.tzinfo is None:
            deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)

        time_delta = deadline_dt - now
        total_hours = time_delta.total_seconds() / 3600.0

        if total_hours < 0:
            # Deadline already passed
            return {
                "score": 100,
                "level": "Critical",
                "reasons": ["Deadline passed without recorded completion."]
            }
        elif total_hours <= 6:
            proximity_score = 35
            reasons.append(f"Critical deadline proximity (<6h left, {round(total_hours, 1)}h remaining): +35")
        elif total_hours <= 12:
            proximity_score = 30
            reasons.append(f"Imminent deadline (<12h left, {round(total_hours, 1)}h remaining): +30")
        elif total_hours <= 24:
            proximity_score = 25
            reasons.append(f"Approaching deadline (<24h left): +25")
        elif total_hours <= 48:
            proximity_score = 18
            reasons.append(f"Deadline within 48h: +18")
        elif total_hours <= 168: # 7 days
            proximity_score = 10
            reasons.append("Deadline within this week: +10")
        else:
            proximity_score = 5
            reasons.append("Future deadline (>7 days): +5")
    else:
        # No explicit deadline, but time-sensitive category
        if cat_upper in ["INTERVIEW", "EXAM", "REGISTRATION"]:
            proximity_score = 15
            reasons.append("No explicit deadline found, urgent category default: +15")

    # 4. Reminder history modifier
    reminder_modifier = 0
    if reminder_count >= 3:
        reminder_modifier = 10
        reasons.append(f"Multiple reminders dispatched ({reminder_count}): +10")
    elif reminder_count == 2:
        reminder_modifier = 6
        reasons.append("Second escalation reminder reached: +6")
    elif reminder_count == 1:
        reminder_modifier = 3
        reasons.append("First escalation reminder reached: +3")

    total_score = min(100, max(0, cat_weight + read_penalty + proximity_score + reminder_modifier))

    if total_score >= 80:
        level = "Critical"
    elif total_score >= 60:
        level = "High"
    elif total_score >= 40:
        level = "Medium"
    elif total_score >= 20:
        level = "Low"
    else:
        level = "Normal"

    return {
        "score": total_score,
        "level": level,
        "reasons": reasons
    }
