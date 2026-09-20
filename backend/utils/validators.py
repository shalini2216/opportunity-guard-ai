import re
from datetime import datetime
from config import Config

EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")

def validate_registration_payload(data: dict):
    """Validate user registration inputs."""
    errors = []
    if not data:
        return ["Request body is missing or invalid JSON"]
    
    email = data.get("email", "").strip()
    password = data.get("password", "")
    name = data.get("name", "").strip()

    if not name or len(name) < 2:
        errors.append("Full name must be at least 2 characters")
    if not email or not EMAIL_REGEX.match(email):
        errors.append("Valid email address is required")
    if not password or len(password) < 6:
        errors.append("Password must be at least 6 characters")
    
    return errors

def validate_category(category: str) -> bool:
    """Validate that category belongs to configured category enum."""
    return category.upper() in Config.CATEGORIES

def validate_iso_date(date_str: str):
    """Validate if string is parseable ISO date format."""
    try:
        if not date_str:
            return None
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except ValueError:
        return None

def sanitize_text(text: str) -> str:
    """Basic HTML tag stripping / sanitization for stored notes."""
    if not text:
        return ""
    # strip script tags or potential XSS vectors
    clean = re.sub(r"<script.*?>.*?</script>", "", text, flags=re.IGNORECASE)
    return clean.strip()
