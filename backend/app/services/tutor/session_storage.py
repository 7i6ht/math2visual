"""
Tutor session storage service.
Uses database when available, falls back to in-memory storage.
This ensures sessions work across multiple Gunicorn workers.
"""
import logging
from typing import Dict, Optional, List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Fallback in-memory store (used when database is unavailable)
_TUTOR_SESSIONS_MEMORY: Dict[str, Dict] = {}

# Session expiration: 2 hours of inactivity
SESSION_EXPIRATION_HOURS = 2

# Flag to track if database is available
_db_available = None


def _check_database_availability() -> bool:
    """Check if database is available for session storage."""
    global _db_available
    if _db_available is not None:
        return _db_available
    
    try:
        from app.config.database import test_database_connection
        _db_available = test_database_connection()
        if not _db_available:
            logger.warning("Database not available for tutor sessions, using in-memory storage. Sessions will not be shared across workers.")
        return _db_available
    except Exception as e:
        logger.warning(f"Error checking database availability: {e}. Using in-memory storage.")
        _db_available = False
        return False


def get_session(session_id: str) -> Optional[Dict]:
    """
    Get a tutor session by ID.
    Returns None if session doesn't exist or is expired.
    """
    if _check_database_availability():
        return _get_session_from_db(session_id)
    else:
        return _get_session_from_memory(session_id)


def _get_session_from_db(session_id: str) -> Optional[Dict]:
    """Get session from database."""
    try:
        from app.config.database import db_session
        from app.models.tutor_session import TutorSession
        
        with db_session() as db:
            session = db.query(TutorSession).filter_by(session_id=session_id).first()
            if not session:
                return None
            
            # Check expiration
            if session.is_expired():
                # Delete expired session
                db.delete(session)
                db.commit()
                return None
            
            # Update last activity
            session.last_activity = datetime.utcnow()
            db.commit()
            
            return session.to_dict()
    except Exception as e:
        logger.error(f"Error getting session from database: {e}. Falling back to memory.")
        return _get_session_from_memory(session_id)


def _get_session_from_memory(session_id: str) -> Optional[Dict]:
    """Get session from in-memory storage."""
    return _TUTOR_SESSIONS_MEMORY.get(session_id)


def save_session(session_id: str, visual_language: str, history: List[Dict], metadata: Optional[Dict] = None) -> None:
    """
    Save or update a tutor session.
    metadata: Optional dictionary for additional session data (e.g., preferred_variant)
    """
    if _check_database_availability():
        _save_session_to_db(session_id, visual_language, history, metadata)
    else:
        _save_session_to_memory(session_id, visual_language, history, metadata)


def _save_session_to_db(session_id: str, visual_language: str, history: List[Dict], metadata: Optional[Dict] = None) -> None:
    """Save session to database."""
    try:
        from app.config.database import db_session
        from app.models.tutor_session import TutorSession
        
        with db_session() as db:
            session = db.query(TutorSession).filter_by(session_id=session_id).first()
            now = datetime.utcnow()
            
            if session:
                # Update existing session
                session.visual_language = visual_language
                session.history = history
                session.last_activity = now
                # Merge metadata if provided
                if metadata:
                    current_metadata = session.session_metadata or {}
                    current_metadata.update(metadata)
                    session.session_metadata = current_metadata
            else:
                # Create new session
                session = TutorSession(
                    session_id=session_id,
                    visual_language=visual_language,
                    history=history,
                    session_metadata=metadata or {},
                    created_at=now,
                    last_activity=now
                )
                db.add(session)
            
            db.commit()
    except Exception as e:
        logger.error(f"Error saving session to database: {e}. Falling back to memory.")
        _save_session_to_memory(session_id, visual_language, history, metadata)


def _save_session_to_memory(session_id: str, visual_language: str, history: List[Dict], metadata: Optional[Dict] = None) -> None:
    """Save session to in-memory storage."""
    session_data = {
        "history": history,
        "visual_language": visual_language,
    }
    if metadata:
        session_data.update(metadata)
    _TUTOR_SESSIONS_MEMORY[session_id] = session_data


def delete_session(session_id: str) -> None:
    """Delete a tutor session."""
    if _check_database_availability():
        _delete_session_from_db(session_id)
    else:
        _delete_session_from_memory(session_id)


def _delete_session_from_db(session_id: str) -> None:
    """Delete session from database."""
    try:
        from app.config.database import db_session
        from app.models.tutor_session import TutorSession
        
        with db_session() as db:
            session = db.query(TutorSession).filter_by(session_id=session_id).first()
            if session:
                db.delete(session)
                db.commit()
    except Exception as e:
        logger.error(f"Error deleting session from database: {e}. Trying memory fallback.")
        _delete_session_from_memory(session_id)


def _delete_session_from_memory(session_id: str) -> None:
    """Delete session from in-memory storage."""
    _TUTOR_SESSIONS_MEMORY.pop(session_id, None)


def cleanup_expired_sessions() -> int:
    """
    Clean up expired sessions from database.
    Returns the number of sessions deleted.
    """
    if not _check_database_availability():
        # For in-memory, we could implement expiration, but it's less critical
        # since sessions are lost on restart anyway
        return 0
    
    try:
        from app.config.database import db_session
        from app.models.tutor_session import TutorSession
        
        with db_session() as db:
            expiration_time = datetime.utcnow() - timedelta(hours=SESSION_EXPIRATION_HOURS)
            expired_sessions = db.query(TutorSession).filter(
                TutorSession.last_activity < expiration_time
            ).all()
            
            count = len(expired_sessions)
            for session in expired_sessions:
                db.delete(session)
            
            db.commit()
            return count
    except Exception as e:
        logger.error(f"Error cleaning up expired sessions: {e}")
        return 0
