"""ChatGPT session storage service for ChatGPT sessions.

All ChatGPT sessions are persisted in the database so that they are shared
across all Gunicorn workers and survive process restarts.
"""
import logging
import os
from typing import Dict, Optional, List
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

# Session expiration (hours of inactivity), configurable via environment.
# Defaults to 2 hours if CHATGPT_SESSION_EXPIRATION_HOURS is not set.
SESSION_EXPIRATION_HOURS = float(os.getenv("CHATGPT_SESSION_EXPIRATION_HOURS", "2"))


def get_chatgpt_session(session_id: str) -> Optional[Dict]:
    """
    Get a ChatGPT session by ID.
    Returns None if session doesn't exist or is expired.
    When analytics is enabled, sessions never expire and are not deleted.
    """
    try:
        from app.config.database import db_session, is_analytics_enabled
        from app.models.chatgpt_session import ChatGPTSession
        
        with db_session() as db:
            session = db.query(ChatGPTSession).filter_by(session_id=session_id).first()
            if not session:
                return None
            
            # Check expiration - is_expired() already returns False when analytics is enabled
            if session.is_expired():
                db.delete(session)
                db.commit()
                return None
            
            # Update last activity
            session.last_activity = datetime.now(timezone.utc)
            db.commit()
            
            return session.to_dict()
    except Exception as e:
        logger.error(f"Error getting ChatGPT session from database: {e}")
        return None


def save_chatgpt_session(session_id: str, history: List[Dict]) -> None:
    """Save or update a ChatGPT session."""
    try:
        from app.config.database import db_session
        from app.models.chatgpt_session import ChatGPTSession
        
        with db_session() as db:
            session = db.query(ChatGPTSession).filter_by(session_id=session_id).first()
            now = datetime.now(timezone.utc)
            
            if session:
                # Update existing session
                session.history = history
                session.last_activity = now
            else:
                # Create new session
                session = ChatGPTSession(
                    session_id=session_id,
                    history=history,
                    created_at=now,
                    last_activity=now
                )
                db.add(session)
            
            db.commit()
    except Exception as e:
        logger.error(f"Error saving ChatGPT session to database: {e}")


def delete_chatgpt_session(session_id: str) -> None:
    """Delete a ChatGPT session."""
    try:
        from app.config.database import db_session
        from app.models.chatgpt_session import ChatGPTSession
        
        with db_session() as db:
            session = db.query(ChatGPTSession).filter_by(session_id=session_id).first()
            if session:
                db.delete(session)
                db.commit()
    except Exception as e:
        logger.error(f"Error deleting ChatGPT session from database: {e}")


def cleanup_expired_chatgpt_sessions() -> int:
    """
    Clean up expired ChatGPT sessions from database.
    Returns the number of sessions deleted.
    When analytics is enabled, no sessions are deleted (returns 0).
    """
    from app.config.database import is_analytics_enabled
    
    # Skip cleanup if analytics is enabled
    if is_analytics_enabled():
        logger.debug("Analytics is enabled, skipping ChatGPT session cleanup")
        return 0
    
    try:
        from app.config.database import db_session
        from app.models.chatgpt_session import ChatGPTSession
        
        with db_session() as db:
            expiration_time = datetime.now(timezone.utc) - timedelta(hours=SESSION_EXPIRATION_HOURS)
            expired_sessions = db.query(ChatGPTSession).filter(
                ChatGPTSession.last_activity < expiration_time
            ).all()
            
            count = len(expired_sessions)
            for session in expired_sessions:
                db.delete(session)
            
            db.commit()
            return count
    except Exception as e:
        logger.error(f"Error cleaning up expired ChatGPT sessions: {e}")
        return 0

