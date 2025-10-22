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


class UserAction(Base):
    """Records individual user actions within a session."""
    
    __tablename__ = 'user_actions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(36), ForeignKey('user_sessions.id'), nullable=False)
    action_type = Column(String(50), nullable=False, index=True)  # e.g., 'form_submit', 'element_click', 'download'
    action_category = Column(String(30), nullable=False, index=True)  # e.g., 'generation', 'interaction', 'navigation'
    element_id = Column(String(100), nullable=True)  # DOM element ID if applicable
    element_type = Column(String(50), nullable=True)  # e.g., 'button', 'input', 'svg_element'
    element_text = Column(Text, nullable=True)  # Text content of the element
    page_url = Column(String(500), nullable=True)  # Frontend route/page
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Action-specific data
    action_data = Column(JSON, nullable=True)  # Flexible JSON for action-specific data
    duration_ms = Column(Integer, nullable=True)  # How long the action took (for async operations)
    success = Column(String(10), default='true', nullable=False)  # true, false, error
    error_message = Column(Text, nullable=True)  # Error details if success=false
    
    # Relationships
    session = relationship("UserSession", back_populates="actions")
    
    # Indexes for common queries
    __table_args__ = (
        Index('idx_action_type_timestamp', 'action_type', 'timestamp'),
        Index('idx_session_timestamp', 'session_id', 'timestamp'),
        Index('idx_category_timestamp', 'action_category', 'timestamp'),
    )
    
    def __repr__(self):
        return f"<UserAction(id={self.id}, type={self.action_type}, timestamp={self.timestamp})>"


class GenerationSession(Base):
    """Tracks complete generation workflows (MWP to visual)."""
    
    __tablename__ = 'generation_sessions'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_session_id = Column(String(36), ForeignKey('user_sessions.id'), nullable=False)
    mwp_text = Column(Text, nullable=False)  # Original math word problem
    formula = Column(Text, nullable=True)  # Mathematical formula if provided
    hint = Column(Text, nullable=True)  # Hint text if provided
    generated_dsl = Column(Text, nullable=True)  # Generated visual language DSL
    dsl_validation_errors = Column(JSON, nullable=True)  # DSL parsing errors
    missing_svg_entities = Column(JSON, nullable=True)  # List of missing SVG entities
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    success = Column(String(10), default='pending', nullable=False)  # pending, success, error
    error_message = Column(Text, nullable=True)
    
    # Generation metadata
    generation_time_ms = Column(Integer, nullable=True)  # Total generation time
    dsl_generation_time_ms = Column(Integer, nullable=True)  # DSL generation time
    visual_generation_time_ms = Column(Integer, nullable=True)  # Visual generation time
    
    # Relationships
    user_session = relationship("UserSession")
    
    def __repr__(self):
        return f"<GenerationSession(id={self.id}, mwp_length={len(self.mwp_text) if self.mwp_text else 0}, success={self.success})>"
