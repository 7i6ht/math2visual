"""
Tutor session storage service.
Uses database when available, falls back to in-memory storage.
This ensures sessions work across multiple Gunicorn workers.
"""
import logging
import os
import time
from typing import Dict, Optional, List
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

# Fallback in-memory store (used when database is unavailable)
_TUTOR_SESSIONS_MEMORY: Dict[str, Dict] = {}

# Session expiration (hours of inactivity), configurable via environment.
# Defaults to 2 hours if TUTOR_SESSION_EXPIRATION_HOURS is not set.
SESSION_EXPIRATION_HOURS = float(os.getenv("TUTOR_SESSION_EXPIRATION_HOURS", "2"))

# Guardrails for in-memory fallback (values in MB, configurable via env)
MEMORY_SOFT_LIMIT_MB = float(os.getenv("TUTOR_SESSION_MEMORY_SOFT_LIMIT_MB", "256"))
MEMORY_HARD_LIMIT_MB = float(os.getenv("TUTOR_SESSION_MEMORY_HARD_LIMIT_MB", "512"))

# Avoid log spam when under memory pressure
_LAST_MEMORY_GUARDRAIL_LOG: Optional[float] = None
MEMORY_GUARDRAIL_LOG_INTERVAL_SECONDS = 60.0

# Flag to track if database is available
_db_available = None


def _get_process_memory_usage_mb() -> Optional[float]:
    """
    Best-effort process RSS in MB.
    Tries psutil if available, falls back to /proc/self/status on Linux.
    Returns None if it cannot be determined.
    """
    # Try psutil first if installed
    try:
        import psutil  # type: ignore

        process = psutil.Process()
        return process.memory_info().rss / (1024 * 1024)
    except Exception:
        pass

    # Fallback for Linux without psutil
    try:
        with open("/proc/self/status") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    parts = line.split()
                    if len(parts) >= 2:
                        # VmRSS is reported in kB
                        kb = float(parts[1])
                        return kb / 1024.0
    except Exception:
        # As a last resort, we just give up and return None
        return None

    return None


def _log_memory_guardrail(message: str, level: int = logging.WARNING) -> None:
    """
    Log memory guardrail events with basic rate limiting to avoid log spam
    under heavy memory pressure.
    """
    global _LAST_MEMORY_GUARDRAIL_LOG
    now = time.time()
    if (
        _LAST_MEMORY_GUARDRAIL_LOG is None
        or now - _LAST_MEMORY_GUARDRAIL_LOG > MEMORY_GUARDRAIL_LOG_INTERVAL_SECONDS
    ):
        _LAST_MEMORY_GUARDRAIL_LOG = now
        logger.log(level, message)


def _cleanup_expired_memory_sessions() -> int:
    """
    Opportunistically clean up expired sessions in the in-memory store.
    Uses the same SESSION_EXPIRATION_HOURS policy as the DB-backed store.
    Returns the number of sessions deleted.
    """
    if not _TUTOR_SESSIONS_MEMORY:
        return 0

    now = datetime.now(timezone.utc)
    expiration_time = now - timedelta(hours=SESSION_EXPIRATION_HOURS)
    to_delete = []

    for session_id, data in list(_TUTOR_SESSIONS_MEMORY.items()):
        last_activity: Optional[datetime] = data.get("last_activity") or data.get("created_at")
        if last_activity and last_activity < expiration_time:
            to_delete.append(session_id)

    for session_id in to_delete:
        _TUTOR_SESSIONS_MEMORY.pop(session_id, None)

    if to_delete:
        _log_memory_guardrail(
            f"Cleaned up {len(to_delete)} expired in-memory tutor session(s). "
            f"Remaining sessions: {len(_TUTOR_SESSIONS_MEMORY)}"
        )

    return len(to_delete)


def _should_block_memory_store() -> bool:
    """
    Determine whether we should block storing additional sessions in the
    in-memory fallback, based on current process memory usage.

    Returns True if we should block storing (i.e., memory usage is too high).
    Returns False if it is safe to proceed with storing a session in memory.
    """
    usage_mb = _get_process_memory_usage_mb()
    if usage_mb is None:
        # If we cannot determine memory usage, do not block writes.
        return False

    # First try to clean up expired sessions when we cross the soft limit
    if usage_mb >= MEMORY_SOFT_LIMIT_MB:
        deleted = _cleanup_expired_memory_sessions()
        if deleted:
            _log_memory_guardrail(
                f"Memory soft limit reached (usage={usage_mb:.1f} MB, "
                f"soft_limit={MEMORY_SOFT_LIMIT_MB:.1f} MB). "
                f"Deleted {deleted} expired in-memory tutor session(s) to free space."
            )
        else:
            _log_memory_guardrail(
                f"Memory soft limit reached (usage={usage_mb:.1f} MB, "
                f"soft_limit={MEMORY_SOFT_LIMIT_MB:.1f} MB) but no expired "
                "in-memory tutor sessions were found to clean up."
            )

    # If we are above the hard limit after cleanup, refuse to store new sessions
    usage_mb_after = _get_process_memory_usage_mb() or usage_mb
    if usage_mb_after >= MEMORY_HARD_LIMIT_MB:
        _log_memory_guardrail(
            f"Memory hard limit reached (usage={usage_mb_after:.1f} MB, "
            f"hard_limit={MEMORY_HARD_LIMIT_MB:.1f} MB). "
            "Refusing to store additional tutor sessions in in-memory fallback.",
            level=logging.ERROR,
        )
        return True

    return False


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
            session.last_activity = datetime.now(timezone.utc)
            db.commit()
            
            return session.to_dict()
    except Exception as e:
        logger.error(f"Error getting session from database: {e}. Falling back to memory.")
        return _get_session_from_memory(session_id)


def _get_session_from_memory(session_id: str) -> Optional[Dict]:
    """Get session from in-memory storage with expiration and activity update."""
    session = _TUTOR_SESSIONS_MEMORY.get(session_id)
    if not session:
        return None

    now = datetime.now(timezone.utc)
    expiration_time = now - timedelta(hours=SESSION_EXPIRATION_HOURS)

    last_activity: Optional[datetime] = session.get("last_activity") or session.get("created_at")
    if last_activity and last_activity < expiration_time:
        # Session expired in memory: delete and behave like a missing session
        _delete_session_from_memory(session_id)
        logger.info(
            "Expired in-memory tutor session %s removed on access (last_activity=%s).",
            session_id,
            last_activity.isoformat() if hasattr(last_activity, "isoformat") else last_activity,
        )
        return None

    # Update last_activity on access to honor inactivity-based expiration
    session["last_activity"] = now
    return session


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
    # Enforce memory guardrails before growing the in-memory store
    if _should_block_memory_store():
        # We intentionally do not raise here to avoid crashing requests;
        # instead, we skip persisting the session and rely on higher-level
        # logic to surface "session not found / expired" on subsequent calls.
        logger.error(
            "Skipping saving tutor session %s to in-memory store due to memory guardrail.",
            session_id,
        )
        return

    now = datetime.now(timezone.utc)
    existing = _TUTOR_SESSIONS_MEMORY.get(session_id) or {}

    # Update core session fields
    existing["history"] = history
    existing["visual_language"] = visual_language

    # Track basic lifecycle timestamps for expiration and observability
    existing.setdefault("created_at", now)
    existing["last_activity"] = now

    # Merge arbitrary metadata last so it can add extra keys if needed
    if metadata:
        existing.update(metadata)

    _TUTOR_SESSIONS_MEMORY[session_id] = existing


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
            expiration_time = datetime.now(timezone.utc) - timedelta(hours=SESSION_EXPIRATION_HOURS)
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
