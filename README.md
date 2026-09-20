# OpportunityGuard AI 🛡️
### Intelligent Email Opportunity & Deadline Protection System

> *"Never miss an important academic, career, or professional opportunity because you forgot to check your email."*

OpportunityGuard AI is an **AI-powered opportunity protection platform** that continuously safeguards high-stakes deadlines (online exams, internship assessments, technical interview invites, college registrations, and assignments) buried in busy inboxes.

Unlike basic email reminder tools, OpportunityGuard AI implements an **Opportunity Protection Engine**:
- **Continuous Attention Monitoring**: Tracks `UNOPENED` → `OPENED` → `ACKNOWLEDGED` → `ACTION_PENDING` → `COMPLETED` lifecycle states.
- **Autonomous Persistent Escalation**: Reminds you on an escalating curve (`T+0`, `T+30m`, `T+2h`, `T+6h`, `T+12h`).
- **Dynamic Stopping Conditions**: Opening an unread email automatically halts unread reminders, but approaching deadline warnings continue while action is pending.
- **Multi-Factor Urgency & Risk Scoring (0–100)**: Evaluates deadline proximity, read state penalty, category weight, and escalation count.

---

## 🌟 Key Features

1. **AI Opportunity Detection & Classification**:
   - Hybrid pipeline utilizing **Google Gemini AI** + robust **Deterministic NLP fallback** for 12 categories: `EXAM`, `INTERNSHIP`, `JOB`, `INTERVIEW`, `MEETING`, `ASSIGNMENT`, `REGISTRATION`, `COLLEGE`, `EVENT`, `FINANCE`, `SECURITY`, `GENERAL`.
2. **Context-Aware Deadline Extraction**:
   - Parses natural phrases (*"within 48 hours"*, *"submit before Friday 5 PM"*, *"registration closes tomorrow midnight"*) with confidence scoring and user correction modals.
3. **Action Tracking & Verified Link Extraction**:
   - Safely extracts assessment links (HackerRank, Codility), video rooms (Google Meet, Zoom), and scheduling portals.
   - Distinct actions: *Mark Completed*, *Remind Later (Snooze)*, and *Still Need to Act*.
4. **"What Am I About to Miss?" Live Radar HUD**:
   - Dedicated executive triage view prioritizing unopened critical emails and deadlines under 24 hours.
5. **Time-Travel Escalation Simulator (Demo Power Feature)**:
   - Interactive accelerator allowing evaluators to fast-forward escalation intervals (`+30m`, `+2h`, `+6h`, `+12h`) in seconds without waiting 12 real hours.
6. **1-Click Calendar Export**:
   - Instantly download RFC 5545 standard `.ics` files or launch direct Google Calendar pre-filled event links.
7. **AI Quick-Action Reply Assistant**:
   - Generates contextual draft replies (e.g. *Confirm Interview Slot*, *Request 24h Extension*, *Acknowledge Submission*).
8. **Privacy Vault & Data Sovereignty**:
   - Zero password storage (OAuth 2.0 PKCE).
   - Minimal metadata retention (zero permanent email body storage).
   - Instant data export (JSON) and one-click GDPR data purge.

---

## 🏗️ System Architecture

```
                               ┌─────────────────────────────────────────┐
                               │           OpportunityGuard AI           │
                               │            React / Vite SPA             │
                               └────────────────────┬────────────────────┘
                                                    │
                                     REST APIs / JWT Bearer
                                                    │
                               ┌────────────────────▼────────────────────┐
                               │            Python Flask API             │
                               │   (Routes, Blueprints, Auth, Security)  │
                               └───────┬────────────┬─────────────┬──────┘
                                       │            │             │
                    ┌──────────────────┴───┐        │       ┌─────┴──────────────────┐
                    │  AI / NLP Pipeline   │        │       │  APScheduler Engine    │
                    │  Gemini + Rule-based │        │       │  Persistent Escalation │
                    │  Deadline Extractor  │        │       │  Stop Condition Check  │
                    └──────────────────────┘        │       └────────────────────────┘
                                                    │
                               ┌────────────────────▼────────────────────┐
                               │            MongoDB Database             │
                               │ (users, emails, opps, reminders, logs)  │
                               └─────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, Web Audio API.
- **Backend**: Python 3.12+, Flask, PyJWT, Bcrypt, Google API Client, Python-Dateutil, Dateparser.
- **Database**: MongoDB (Local or MongoDB Atlas).
- **Scheduler**: APScheduler (Background thread with clean Celery/Redis migration path).
- **Deployment**: Docker, Docker Compose, Nginx reverse proxy.

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- Python 3.12+ (Python 3.14 supported)
- Node.js 20+ & npm
- MongoDB running locally on `localhost:27017` (or MongoDB Atlas connection URI)

### 2. Backend Setup
```bash
cd backend
python -m venv .venv

# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python app.py
```
*Backend runs at `http://localhost:5000` with active background scheduler.*

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
*Frontend runs at `http://localhost:5173` with automated API proxying.*

---

## 🧪 Automated Testing

Run the full pytest suite verifying NLP classification, relative deadline extraction, risk engine calculations, and state transitions:
```bash
cd backend
.\.venv\Scripts\pytest.exe
```
*All 11 unit & integration tests pass with 100% success.*

---

## 🎮 Interactive Demo Mode Walkthrough

OpportunityGuard AI includes a complete zero-dependency Demo Mode so anyone can evaluate the full system without entering real email credentials:

1. Visit `http://localhost:5173`.
2. Click **"Instant Demo Mode"** on the landing page or login page.
3. The platform seeds 7 realistic communications:
   - *Goldman Sachs Summer Analyst Coding Assessment (48h deadline)*
   - *Google Software Engineer Interview Invitation (confirm slot by tomorrow 5 PM)*
   - *University Registrar Course Enrollment (closes Friday midnight)*
   - *CS401 Capstone Final Deliverable (due Sunday midnight)*
   - *Architecture Review & Sprint Sync (Monday 10 AM)*
   - *Non-urgent Cloud Architecture Newsletter (classified as OTHER, no reminder)*
   - *Flash Sale Marketing Offer (classified as OTHER, no reminder)*
4. **Test the Escalation Cycle**:
   - Use the **Time Simulator** bar at the top of the dashboard.
   - Click **"+30 Mins (Step 1)"** and **"+2 Hours (Step 2)"**: Notice persistent notifications dispatched and urgency score increasing because the emails are unopened!
   - Click on any email (e.g. *Goldman Sachs Assessment*) to open and read it.
   - Notice state transitions to `OPENED` / `ACTION_PENDING`, and **unread persistent reminders are halted immediately**!
   - Click **"Still Need to Act"** → deadline reminder schedules for 2 hours before deadline.
   - Click **"Mark as Completed"** → all reminders stop permanently.
   - Try the **1-Click Google Calendar** and **AI Quick-Reply Draft** generator.

---

## 🔒 Security & Privacy Practices

- **Zero Password Storage**: OAuth 2.0 PKCE is used for Gmail mailbox connections.
- **Strict JWT Token Expiration**: HS256 signed tokens with user sub verification.
- **Audit Trails**: Security events logged with client IP address and timestamp.
- **GDPR Data Deletion**: Users can export full data as JSON or trigger a complete permanent data wipe from the Privacy Vault.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
