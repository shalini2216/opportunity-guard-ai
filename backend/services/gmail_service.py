import os
from datetime import datetime, timezone
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from config import Config
from utils.db import get_db

SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
]

def get_oauth_flow():
    """Build OAuth2 flow using configured Google Client credentials."""
    if not Config.GMAIL_CLIENT_ID or not Config.GMAIL_CLIENT_SECRET:
        return None
    
    client_config = {
        "web": {
            "client_id": Config.GMAIL_CLIENT_ID,
            "client_secret": Config.GMAIL_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [Config.GMAIL_REDIRECT_URI]
        }
    }
    
    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        redirect_uri=Config.GMAIL_REDIRECT_URI
    )
    return flow

def get_authorization_url():
    """Generates the Google OAuth authorization URL."""
    flow = get_oauth_flow()
    if not flow:
        return {
            "error": "Gmail OAuth credentials not configured in backend environment variables. Please use Demo Mode for full interactive evaluation or configure GMAIL_CLIENT_ID.",
            "url": None
        }
    
    auth_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    return {"url": auth_url, "state": state}

def exchange_code_and_store_account(user_id: str, code: str):
    """Exchange OAuth code for tokens and save email account metadata."""
    flow = get_oauth_flow()
    if not flow:
        return {"error": "Gmail credentials not configured"}

    flow.fetch_token(code=code)
    creds = flow.credentials

    # Fetch user's Gmail address
    service = build('gmail', 'v1', credentials=creds)
    profile = service.users().getProfile(userId='me').execute()
    email_address = profile.get('emailAddress')

    db = get_db()
    account_data = {
        "user_id": user_id,
        "provider": "google",
        "email_address": email_address,
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "scopes": creds.scopes,
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "status": "CONNECTED"
    }

    db.email_accounts.update_one(
        {"user_id": user_id, "provider": "google"},
        {"$set": account_data},
        upsert=True
    )
    return {"email_address": email_address, "status": "CONNECTED"}

def disconnect_account(user_id: str):
    """Disconnect and purge OAuth tokens for the given user."""
    db = get_db()
    db.email_accounts.delete_many({"user_id": user_id})
    return {"success": True, "message": "Email account disconnected and tokens purged."}
