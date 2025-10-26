"""
Analytics API routes for user action recording and analysis.
"""
from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import uuid

from app.config.database import get_db
from app.models.user_actions import UserSession, Action

analytics_bp = Blueprint('analytics', __name__)


def get_or_create_session(session_id: str, ip_address: Optional[str] = None, 
                         user_agent: Optional[str] = None) -> UserSession:
    """Get existing session or create a new one."""
    db = next(get_db())
    try:
        # Try to get existing session
        session = db.query(UserSession).filter(UserSession.session_id == session_id).first()
        
        if session:
            # Update last activity
            session.last_activity = datetime.utcnow()
            db.commit()
            return session
        
        # Create new session
        new_session = UserSession(
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        return new_session
        
    finally:
        db.close()


@analytics_bp.route('/api/analytics/session', methods=['POST'])
def create_session():
    """Create or update a user session."""
    try:
        data = request.get_json()
        session_id = data.get('session_id')
        ip_address = request.remote_addr
        user_agent = request.headers.get('User-Agent')
        
        if not session_id:
            return jsonify({'error': 'session_id is required'}), 400
        
        session = get_or_create_session(session_id, ip_address, user_agent)
        
        return jsonify({
            'success': True,
            'session_id': session.session_id,
            'created_at': session.created_at.isoformat(),
            'last_activity': session.last_activity.isoformat()
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to create session: {str(e)}'}), 500


@analytics_bp.route('/api/analytics/action', methods=['POST'])
def record_action():
    """Record a an action."""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['session_id', 'action_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Get or create session
        session = get_or_create_session(data['session_id'])
        
        # Create action record
        db = next(get_db())
        try:
            action = Action(
                session_id=session.id,
                type=data['action_type'],
                data=data.get('action_data'),
                timestamp=data.get('timestamp')
            )
            
            db.add(action)
            db.commit()
            db.refresh(action)
            
            return jsonify({
                'success': True,
                'action_id': action.id
            })
            
        finally:
            db.close()
            
    except Exception as e:
        return jsonify({'error': f'Failed to record action: {str(e)}'}), 500
