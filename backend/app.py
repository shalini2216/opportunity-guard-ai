import os
from flask import Flask, jsonify
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from config import Config
from utils.db import get_db

from routes.auth import auth_bp
from routes.email import email_bp
from routes.opportunities import opportunities_bp
from routes.reminders import reminders_bp
from routes.notifications import notifications_bp
from routes.settings import settings_bp
from routes.demo import demo_bp
from services.reminder_engine import run_reminder_check_cycle

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend integration
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(email_bp, url_prefix="/api/email")
    app.register_blueprint(opportunities_bp, url_prefix="/api/opportunities")
    app.register_blueprint(reminders_bp, url_prefix="/api/reminders")
    app.register_blueprint(notifications_bp, url_prefix="/api/notifications")
    app.register_blueprint(settings_bp, url_prefix="/api/settings")
    app.register_blueprint(demo_bp, url_prefix="/api/demo")

    # Health Check
    @app.route("/api/health", methods=["GET"])
    def health_check():
        db_ok = True
        try:
            get_db().command("ping")
        except Exception:
            db_ok = False
        return jsonify({
            "status": "healthy" if db_ok else "database_degraded",
            "service": "OpportunityGuard AI",
            "version": "1.0.0",
            "database_connected": db_ok
        })

    # Centralized friendly error handling (PDF Section 30)
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"success": False, "error": "Bad request", "details": str(error)}), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"success": False, "error": "Requested resource was not found"}), 404

    @app.errorhandler(500)
    def server_error(error):
        # Prevent raw stack trace leaks
        return jsonify({"success": False, "error": "An internal server error occurred. Our team has been notified."}), 500

    # Initialize APScheduler for autonomous background reminders
    # Only start scheduler if not running under reload process
    if not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        try:
            scheduler = BackgroundScheduler(daemon=True)
            scheduler.add_job(
                func=run_reminder_check_cycle,
                trigger="interval",
                seconds=60,
                id="opportunity_guard_reminder_cycle",
                name="Check pending reminders and deadlines every minute",
                replace_existing=True
            )
            scheduler.start()
            app.logger.info("APScheduler background reminder engine started.")
        except Exception as e:
            app.logger.warning(f"Scheduler initialization warning: {e}")

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
