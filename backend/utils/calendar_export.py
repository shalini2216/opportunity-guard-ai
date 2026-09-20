import urllib.parse
from datetime import datetime, timedelta, timezone

def generate_google_calendar_url(title: str, description: str, deadline_dt: datetime, link: str = None) -> str:
    """Generate a 1-click Google Calendar quick-add URL."""
    if not deadline_dt:
        return ""
    
    # Event default start: 1 hour before deadline; end: at deadline
    end_utc = deadline_dt.astimezone(timezone.utc)
    start_utc = end_utc - timedelta(hours=1)

    start_str = start_utc.strftime("%Y%m%dT%H%M%SZ")
    end_str = end_utc.strftime("%Y%m%dT%H%M%SZ")

    details = description or ""
    if link:
        details += f"\n\nOpportunity Action Link: {link}"
    details += "\n\nProtected by OpportunityGuard AI"

    params = {
        "action": "TEMPLATE",
        "text": f"Deadline: {title}",
        "dates": f"{start_str}/{end_str}",
        "details": details,
        "location": link or "Online / Opportunity Portal",
        "trp": "true"
    }

    base_url = "https://calendar.google.com/calendar/render"
    return f"{base_url}?{urllib.parse.urlencode(params)}"

def generate_ics_content(title: str, description: str, deadline_dt: datetime, link: str = None) -> str:
    """Generate RFC 5545 standard iCalendar (.ics) format file content."""
    if not deadline_dt:
        return ""

    end_utc = deadline_dt.astimezone(timezone.utc)
    start_utc = end_utc - timedelta(hours=1)
    now_utc = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    start_str = start_utc.strftime("%Y%m%dT%H%M%SZ")
    end_str = end_utc.strftime("%Y%m%dT%H%M%SZ")
    uid = f"oppguard-{int(deadline_dt.timestamp())}-{abs(hash(title))}@opportunityguard.ai"

    details = (description or "").replace("\n", "\\n")
    if link:
        details += f"\\n\\nAction Link: {link}"

    ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//OpportunityGuard AI//Opportunity Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{now_utc}",
        f"DTSTART:{start_str}",
        f"DTEND:{end_str}",
        f"SUMMARY:Deadline: {title}",
        f"DESCRIPTION:{details}",
        f"URL:{link or ''}",
        "STATUS:CONFIRMED",
        "BEGIN:VALARM",
        "TRIGGER:-PT2H",
        "ACTION:DISPLAY",
        f"DESCRIPTION:OpportunityGuard Reminder: {title} deadline approaching",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR"
    ]
    return "\r\n".join(ics)
