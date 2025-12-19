"""
Database model for tutor sessions in Math2Visual.
Stores tutor session data in the database to support multiple Gunicorn workers.
"""
import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict
from sqlalchemy import Column, String, DateTime, Text, JSON, Index
from app.models.user_actions import Base

logger = logging.getLogger(__name__)

# Session expiration (hours of inactivity), configurable via environment.
# Defaults to 2 hours if TUTOR_SESSION_EXPIRATION_HOURS is not set.
SESSION_EXPIRATION_HOURS = float(os.getenv("TUTOR_SESSION_EXPIRATION_HOURS", "2"))


class TutorSession(Base):
    """Represents a tutor session for math word problem tutoring."""
    
    __tablename__ = 'tutor_sessions'
    
    session_id = Column(String(36), primary_key=True)
    visual_language = Column(Text, nullable=False, default="")
    history = Column(JSON, nullable=False, default=list)
    session_metadata = Column(JSON, nullable=True, default=dict)  # For storing additional fields like preferred_variant
    # Store UTC timestamps as timezone-aware datetimes (TIMESTAMP WITH TIME ZONE in PostgreSQL)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    last_activity = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    
    # Indexes for efficient queries
    __table_args__ = (
        Index('idx_tutor_session_last_activity', 'last_activity'),
        Index('idx_tutor_session_created', 'created_at'),
    )
    
    def is_expired(self) -> bool:
        """Check if the session has expired based on last activity."""
        if not self.last_activity:
            return True
        
        # Ensure last_activity is timezone-aware UTC for consistent comparison
        # This handles edge cases where SQLAlchemy might return timezone-naive
        # or timezone-aware datetimes in different timezones
        if self.last_activity.tzinfo is None:
            # If timezone-naive, assume it's UTC (as stored)
            last_activity_utc = self.last_activity.replace(tzinfo=timezone.utc)
            logger.warning(
                f"Session {self.session_id} has timezone-naive last_activity: {self.last_activity}. "
                f"Assuming UTC. This should not happen with proper timezone configuration."
            )
        else:
            # If timezone-aware, convert to UTC
            last_activity_utc = self.last_activity.astimezone(timezone.utc)
            if self.last_activity.tzinfo != timezone.utc:
                logger.debug(
                    f"Session {self.session_id} last_activity timezone converted: "
                    f"{self.last_activity.tzinfo} -> UTC"
                )
        
        expiration_time = last_activity_utc + timedelta(hours=SESSION_EXPIRATION_HOURS)
        now_utc = datetime.now(timezone.utc)
        is_expired = now_utc > expiration_time
        
        if is_expired:
            logger.debug(
                f"Session {self.session_id} expired: last_activity={last_activity_utc}, "
                f"expiration_time={expiration_time}, now={now_utc}"
            )
        
        return is_expired
    
    def to_dict(self) -> Dict:
        """Convert session to dictionary format compatible with existing code."""
        result = {
            "history": self.history or [],
            "visual_language": self.visual_language or "",
        }
        # Merge session_metadata into result
        if self.session_metadata:
            result.update(self.session_metadata)
        return result
    
    def __repr__(self):
        return f"<TutorSession(session_id={self.session_id}, created_at={self.created_at}, last_activity={self.last_activity})>"
