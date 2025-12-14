"""
Database model for tutor sessions in Math2Visual.
Stores tutor session data in the database to support multiple Gunicorn workers.
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from sqlalchemy import Column, String, DateTime, Text, JSON, Index
from app.models.user_actions import Base

# Session expiration: 2 hours of inactivity
SESSION_EXPIRATION_HOURS = 2


class TutorSession(Base):
    """Represents a tutor session for math word problem tutoring."""
    
    __tablename__ = 'tutor_sessions'
    
    session_id = Column(String(36), primary_key=True)
    visual_language = Column(Text, nullable=False, default="")
    history = Column(JSON, nullable=False, default=list)
    session_metadata = Column(JSON, nullable=True, default=dict)  # For storing additional fields like preferred_variant
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    last_activity = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Indexes for efficient queries
    __table_args__ = (
        Index('idx_tutor_session_last_activity', 'last_activity'),
        Index('idx_tutor_session_created', 'created_at'),
    )
    
    def is_expired(self) -> bool:
        """Check if the session has expired based on last activity."""
        if not self.last_activity:
            return True
        expiration_time = self.last_activity + timedelta(hours=SESSION_EXPIRATION_HOURS)
        return datetime.utcnow() > expiration_time
    
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
