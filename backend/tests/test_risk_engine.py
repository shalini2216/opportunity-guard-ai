import pytest
from datetime import datetime, timezone, timedelta
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.risk_engine import calculate_risk_score

def test_completed_opportunity_is_zero():
    res = calculate_risk_score("EXAM", is_completed=True)
    assert res["score"] == 0
    assert res["level"] == "Normal"

def test_unopened_urgent_interview():
    now = datetime(2026, 9, 20, 12, 0, tzinfo=timezone.utc)
    deadline = now + timedelta(hours=4) # < 6h proximity (+35)
    res = calculate_risk_score(
        category="INTERVIEW", # 35
        deadline_dt=deadline,
        read_state="UNOPENED", # +25
        action_status="ACTION_PENDING",
        reminder_count=1, # +3
        reference_now=now
    )
    # 35 + 25 + 35 + 3 = 98 -> Critical
    assert res["score"] >= 80
    assert res["level"] == "Critical"

def test_passed_deadline_is_critical_100():
    now = datetime(2026, 9, 20, 12, 0, tzinfo=timezone.utc)
    deadline = now - timedelta(hours=1) # passed
    res = calculate_risk_score(
        category="ASSIGNMENT",
        deadline_dt=deadline,
        read_state="OPENED",
        action_status="ACTION_PENDING",
        reference_now=now
    )
    assert res["score"] == 100
    assert res["level"] == "Critical"

def test_opened_removes_unopened_penalty():
    now = datetime(2026, 9, 20, 12, 0, tzinfo=timezone.utc)
    deadline = now + timedelta(days=5)
    score_unopened = calculate_risk_score("JOB", deadline_dt=deadline, read_state="UNOPENED", reference_now=now)["score"]
    score_opened = calculate_risk_score("JOB", deadline_dt=deadline, read_state="OPENED", reference_now=now)["score"]
    assert score_unopened > score_opened
