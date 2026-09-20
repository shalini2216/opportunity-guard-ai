import os
import imaplib
import email
from email.header import decode_header
import base64
from datetime import datetime, timezone
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from config import Config
from utils.db import get_db
from services.opportunity_detector import process_email_and_detect_opportunity

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
            "error": "Google Cloud OAuth credentials not configured in backend environment variables. Please use Direct Gmail Sync (App Password) or configure GMAIL_CLIENT_ID.",
            "url": None
        }
    
    auth_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )
    return {"url": auth_url, "state": state}

def exchange_code_and_store_account(user_id: str, code: str):
    """Exchange OAuth code for tokens, save email account metadata, and perform initial sync."""
    flow = get_oauth_flow()
    if not flow:
        return {"error": "Gmail OAuth credentials not configured"}

    flow.fetch_token(code=code)
    creds = flow.credentials

    service = build('gmail', 'v1', credentials=creds)
    profile = service.users().getProfile(userId='me').execute()
    email_address = profile.get('emailAddress')

    db = get_db()
    account_data = {
        "user_id": user_id,
        "provider": "google_oauth",
        "email_address": email_address,
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "scopes": creds.scopes,
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "status": "CONNECTED"
    }

    db.email_accounts.update_one(
        {"user_id": user_id},
        {"$set": account_data},
        upsert=True
    )

    # Initial sync
    sync_res = sync_messages_via_oauth(user_id)
    return {"email_address": email_address, "status": "CONNECTED", "sync": sync_res}

def sync_messages_via_oauth(user_id: str, max_messages: int = 25):
    """Fetch recent messages from Gmail via REST API."""
    db = get_db()
    account = db.email_accounts.find_one({"user_id": user_id, "provider": "google_oauth", "status": "CONNECTED"})
    if not account:
        return {"error": "No connected Gmail OAuth account found"}

    creds = Credentials(
        token=account.get("access_token"),
        refresh_token=account.get("refresh_token"),
        token_uri=account.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=Config.GMAIL_CLIENT_ID,
        client_secret=Config.GMAIL_CLIENT_SECRET,
        scopes=account.get("scopes", SCOPES)
    )

    service = build('gmail', 'v1', credentials=creds)
    results = service.users().messages().list(userId='me', maxResults=max_messages).execute()
    messages = results.get('messages', [])

    synced_count = 0
    opps_detected = 0

    for msg_meta in messages:
        msg_id = msg_meta['id']
        existing = db.emails.find_one({"user_id": user_id, "provider_id": msg_id})
        if existing:
            continue

        msg = service.users().messages().get(userId='me', id=msg_id, format='full').execute()
        headers = {h['name'].lower(): h['value'] for h in msg.get('payload', {}).get('headers', [])}

        subject = headers.get('subject', 'No Subject')
        sender = headers.get('from', 'Unknown Sender')
        date_raw = headers.get('date', '')

        # Determine read state from Gmail labels
        labels = msg.get('labelIds', [])
        is_unread = 'UNREAD' in labels
        read_state = "UNOPENED" if is_unread else "OPENED"

        # Extract body snippet / text
        body_text = msg.get('snippet', '')
        if 'parts' in msg.get('payload', {}):
            for part in msg['payload']['parts']:
                if part.get('mimeType') == 'text/plain' and 'data' in part.get('body', {}):
                    try:
                        body_text = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='ignore')
                        break
                    except Exception:
                        pass

        received_iso = datetime.now(timezone.utc).isoformat()
        email_doc = {
            "user_id": user_id,
            "provider_id": msg_id,
            "sender": sender,
            "subject": subject,
            "snippet": msg.get('snippet', body_text[:150]),
            "body_text": body_text,
            "received_at": received_iso,
            "read_state": read_state,
            "source": "gmail_oauth"
        }

        res = db.emails.insert_one(email_doc)
        email_doc["_id"] = res.inserted_id
        synced_count += 1

        detection = process_email_and_detect_opportunity(user_id, email_doc)
        if detection.get("opportunity_id"):
            opps_detected += 1

    return {"synced_emails": synced_count, "opportunities_detected": opps_detected}

def decode_mime_words(s):
    """Helper to decode MIME encoded email headers."""
    if not s:
        return ""
    decoded_fragments = decode_header(s)
    result = []
    for fragment, encoding in decoded_fragments:
        if isinstance(fragment, bytes):
            try:
                result.append(fragment.decode(encoding or 'utf-8', errors='replace'))
            except Exception:
                result.append(fragment.decode('latin1', errors='replace'))
        else:
            result.append(str(fragment))
    return "".join(result)

def sync_gmail_via_imap(user_id: str, email_address: str, app_password: str, max_emails: int = 25):
    """
    Direct Gmail Sync via IMAP using an App Password.
    This provides 100% reliable connection to real Gmail inboxes without requiring
    Google Cloud Project verification or complex OAuth setup.
    """
    # Clean spaces from app password
    clean_password = app_password.replace(" ", "").strip()
    clean_email = email_address.strip()

    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com", 993)
        mail.login(clean_email, clean_password)
    except imaplib.IMAP4.error as e:
        return {"error": f"Gmail login failed: {str(e)}. Please verify your Gmail address and 16-character App Password."}
    except Exception as e:
        return {"error": f"Failed to connect to imap.gmail.com: {str(e)}"}

    try:
        mail.select("INBOX")
        status, response = mail.search(None, "ALL")
        if status != "OK":
            return {"error": "Could not access INBOX folder"}

        email_ids = response[0].split()
        # Take the most recent emails
        recent_ids = email_ids[-max_emails:] if len(email_ids) > max_emails else email_ids
        recent_ids.reverse() # Most recent first

        db = get_db()
        synced_count = 0
        opps_detected = 0

        for e_id in recent_ids:
            try:
                # Check flags (Seen / Unseen)
                status, flag_data = mail.fetch(e_id, '(FLAGS)')
                is_unopened = True
                if status == 'OK' and flag_data:
                    flags_str = str(flag_data[0])
                    if r'\Seen' in flags_str:
                        is_unopened = False

                # Fetch RFC 822 body
                status, msg_data = mail.fetch(e_id, '(RFC822)')
                if status != 'OK' or not msg_data:
                    continue

                raw_email = msg_data[0][1]
                msg = email.message_from_bytes(raw_email)

                # Decode subject and sender
                subject = decode_mime_words(msg.get("Subject", "No Subject"))
                sender = decode_mime_words(msg.get("From", "Unknown Sender"))
                msg_uid = f"imap_{clean_email}_{e_id.decode()}"

                # Check if already imported
                existing = db.emails.find_one({"user_id": user_id, "provider_id": msg_uid})
                if existing:
                    continue

                # Extract plain text body
                body_text = ""
                if msg.is_multipart():
                    for part in msg.walk():
                        content_type = part.get_content_type()
                        content_disposition = str(part.get("Content-Disposition"))
                        if content_type == "text/plain" and "attachment" not in content_disposition:
                            try:
                                body_text = part.get_payload(decode=True).decode(part.get_content_charset() or 'utf-8', errors='replace')
                                break
                            except Exception:
                                pass
                else:
                    try:
                        body_text = msg.get_payload(decode=True).decode(msg.get_content_charset() or 'utf-8', errors='replace')
                    except Exception:
                        body_text = str(msg.get_payload())

                snippet = body_text[:180].replace("\n", " ").strip() if body_text else subject

                email_doc = {
                    "user_id": user_id,
                    "provider_id": msg_uid,
                    "sender": sender,
                    "subject": subject,
                    "snippet": snippet,
                    "body_text": body_text or snippet,
                    "received_at": datetime.now(timezone.utc).isoformat(),
                    "read_state": "UNOPENED" if is_unopened else "OPENED",
                    "source": "gmail_imap"
                }

                res = db.emails.insert_one(email_doc)
                email_doc["_id"] = res.inserted_id
                synced_count += 1

                detection = process_email_and_detect_opportunity(user_id, email_doc)
                if detection.get("opportunity_id"):
                    opps_detected += 1
            except Exception as item_err:
                print(f"Error parsing email {e_id}: {item_err}")
                continue

        mail.close()
        mail.logout()

        # Save connected account
        db.email_accounts.update_one(
            {"user_id": user_id},
            {"$set": {
                "user_id": user_id,
                "provider": "gmail_imap",
                "email_address": clean_email,
                "app_password": clean_password, # Stored to allow background sync cycles
                "connected_at": datetime.now(timezone.utc).isoformat(),
                "last_synced_at": datetime.now(timezone.utc).isoformat(),
                "status": "CONNECTED"
            }},
            upsert=True
        )

        return {
            "success": True,
            "email_address": clean_email,
            "synced_emails": synced_count,
            "opportunities_detected": opps_detected,
            "message": f"Successfully connected {clean_email}! Synced {synced_count} emails and detected {opps_detected} time-sensitive opportunities."
        }
    except Exception as e:
        return {"error": f"IMAP sync failed: {str(e)}"}

def disconnect_account(user_id: str):
    """Disconnect and purge all email accounts for the user."""
    db = get_db()
    db.email_accounts.delete_many({"user_id": user_id})
    return {"success": True, "message": "Email account disconnected and credentials purged."}
