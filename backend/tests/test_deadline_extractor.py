import pytest
from datetime import datetime, timezone, timedelta
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.deadline_extractor import extract_deadline

def test_extract_relative_hours():
    text = "Please complete your HackerRank assessment within 48 hours."
    base_time = datetime(2026, 9, 20, 10, 0, tzinfo=timezone.utc)
    res = extract_deadline(text, base_date=base_time)
    
    assert res["deadline_dt"] is not None
    assert res["confidence"] >= 0.90
    expected = base_time + timedelta(hours=48)
    assert abs((res["deadline_dt"] - expected).total_seconds()) < 60

def test_extract_explicit_deadline_phrase():
    text = "Deadline: September 25, 2026 at 5:00 PM for all submissions."
    res = extract_deadline(text)
    assert res["deadline_dt"] is not None
    assert "September 25" in res["raw_extracted"] or res["deadline_dt"].month == 9

def test_extract_tomorrow():
    text = "Please confirm your attendance by tomorrow at 5 PM."
    base_time = datetime(2026, 9, 20, 12, 0, tzinfo=timezone.utc)
    res = extract_deadline(text, base_date=base_time)
    assert res["deadline_dt"] is not None

def test_empty_text_handling():
    res = extract_deadline("")
    assert res["deadline_dt"] is None
    assert res["confidence"] == 0.0
    assert res["is_low_confidence"] is True
