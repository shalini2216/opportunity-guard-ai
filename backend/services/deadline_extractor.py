import re
from datetime import datetime, timedelta, timezone
import dateparser

DEADLINE_PATTERNS = [
    # Explicit deadline prefixes
    r"(?:deadline|due\s+date|submit\s+by|complete\s+by|expires\s+at|closes\s+on|closes\s+at|valid\s+until|scheduled\s+for|finish\s+before)[:\s]+([A-Za-z0-9,:\s\-\/]+?)(?:\.|\n|$|\)|;)",
    # "before/by <time> on <date>" or "by <date> <time>"
    r"(?:by|before|until)\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{4})?(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)?)",
    # Relative windows like "within 48 hours", "within 3 days"
    r"within\s+(\d+)\s+(hour|hours|day|days)",
    # "tomorrow at 5 PM", "tomorrow midnight"
    r"(tomorrow(?:\s+(?:at\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?|midnight|noon))?)",
    # "by Friday at 5 PM"
    r"(?:by|before|on)\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:\s+(?:at|before)\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)?"
]

def extract_deadline(text: str, base_date: datetime = None) -> dict:
    """
    Extract date/deadline from email subject and body text.
    Returns:
    {
        "deadline_iso": str | None,
        "deadline_dt": datetime | None,
        "raw_extracted": str | None,
        "confidence": float (0.0 - 1.0),
        "is_low_confidence": bool
    }
    """
    if not text:
        return {
            "deadline_iso": None,
            "deadline_dt": None,
            "raw_extracted": None,
            "confidence": 0.0,
            "is_low_confidence": True
        }

    now = base_date or datetime.now(timezone.utc)
    settings = {
        'RELATIVE_BASE': now.replace(tzinfo=None),
        'RETURN_AS_TIMEZONE_AWARE': False,
        'PREFER_DATES_FROM': 'future'
    }

    # 1. Check for "within X hours / days" pattern
    hours_match = re.search(r"within\s+(\d+)\s+(hour|hours|day|days)", text, re.IGNORECASE)
    if hours_match:
        val = int(hours_match.group(1))
        unit = hours_match.group(2).lower()
        if "day" in unit:
            calculated_dt = now + timedelta(days=val)
        else:
            calculated_dt = now + timedelta(hours=val)
        return {
            "deadline_iso": calculated_dt.isoformat(),
            "deadline_dt": calculated_dt,
            "raw_extracted": hours_match.group(0),
            "confidence": 0.95,
            "is_low_confidence": False
        }

    # 2. Iterate regex patterns
    best_candidate = None
    best_parsed_dt = None
    highest_confidence = 0.0

    for pattern in DEADLINE_PATTERNS:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for m in matches:
            candidate_snippet = m.group(1) if m.groups() else m.group(0)
            candidate_snippet = candidate_snippet.strip(" \t\n,.;:")
            if len(candidate_snippet) < 3 or len(candidate_snippet) > 60:
                continue

            parsed = dateparser.parse(candidate_snippet, settings=settings)
            if parsed:
                # Ensure parsed date is in future or today
                naive_now = now.replace(tzinfo=None)
                if parsed < naive_now and (naive_now - parsed).days > 1:
                    # Might have parsed as past year; try adding 1 year if relative month
                    continue

                parsed_aware = parsed.replace(tzinfo=timezone.utc)
                conf = 0.90 if any(kw in candidate_snippet.lower() for kw in ["am", "pm", ":", "202", "203"]) else 0.75
                if conf > highest_confidence:
                    highest_confidence = conf
                    best_candidate = candidate_snippet
                    best_parsed_dt = parsed_aware

    # 3. Fallback generic date scanning if not found yet
    if not best_parsed_dt:
        # Check standard date strings (e.g. "Sept 25, 2026", "2026-09-30")
        date_pattern = re.search(r"\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b", text, re.IGNORECASE)
        if date_pattern:
            snippet = date_pattern.group(0)
            parsed = dateparser.parse(snippet, settings=settings)
            if parsed:
                best_candidate = snippet
                best_parsed_dt = parsed.replace(tzinfo=timezone.utc)
                highest_confidence = 0.70

    if best_parsed_dt:
        return {
            "deadline_iso": best_parsed_dt.isoformat(),
            "deadline_dt": best_parsed_dt,
            "raw_extracted": best_candidate,
            "confidence": highest_confidence,
            "is_low_confidence": highest_confidence < 0.80
        }

    return {
        "deadline_iso": None,
        "deadline_dt": None,
        "raw_extracted": None,
        "confidence": 0.0,
        "is_low_confidence": True
    }
