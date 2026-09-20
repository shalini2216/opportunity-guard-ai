import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.email_analyzer import analyze_email_deterministic, extract_links

def test_classify_internship():
    subject = "Goldman Sachs Summer 2026 Internship Coding Assessment"
    body = "Complete your assessment on HackerRank within 48 hours: https://hackerrank.com/test1234"
    res = analyze_email_deterministic("recruiting@gs.com", subject, body)
    assert res["category"] == "INTERNSHIP"
    assert res["is_important"] is True
    assert res["requires_action"] is True
    assert len(res["links"]) > 0
    assert "Assessment Portal" in [link["label"] for link in res["links"]]

def test_classify_promotional_email():
    subject = "Massive 50% discount sale on cloud hosting!"
    body = "Use coupon code SALE50. Click here to unsubscribe from this marketing newsletter."
    res = analyze_email_deterministic("deals@promo.com", subject, body)
    assert res["is_important"] is False
    assert res["category"] in ["OTHER", "GENERAL"]

def test_link_purpose_identification():
    text = "Join our interview on https://meet.google.com/abc-defg-hij and check code at https://github.com/myrepo"
    links = extract_links(text)
    labels = {l["url"]: l["label"] for l in links}
    assert "Video Meeting Link" in labels.values()
    assert "Code Repository" in labels.values()
