"""
Database models for user action recording in Math2Visual.
"""
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Index, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import uuid

Base = declarative_base()


class UserSession(Base):
    """Represents a user session for tracking user actions."""
    
    __tablename__ = 'user_sessions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(100), unique=True, nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_activity = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(String(10), default='active', nullable=False)  # active, ended
    
    # Relationships
    actions = relationship("UserAction", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<UserSession(id={self.id}, session_id={self.session_id}, created_at={self.created_at})>"


class Action(Base):
    """Records actions within a session."""
    
    __tablename__ = 'actions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey('user_sessions.id'), nullable=False)
    type = Column(String(50), nullable=False, index=True)  # e.g., 'form_submit', 'element_click', 'download'
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Action-specific data
    action_data = Column(JSON, nullable=True)  # Flexible JSON for action-specific data

    
    # Relationships
    session = relationship("UserSession", back_populates="actions")
    
    # Indexes for common queries
    __table_args__ = (
        Index('idx_action_type_timestamp', 'type', 'timestamp'),
        Index('idx_session_timestamp', 'session_id', 'timestamp'),
    )
    
    def __repr__(self):
        return f"<UserAction(type={self.type}, data={self.data}, timestamp={self.timestamp})>"