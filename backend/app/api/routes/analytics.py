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
from app.models.user_actions import UserSession, UserAction, GenerationSession

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
    """Record a user action."""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['session_id', 'action_type', 'action_category']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Get or create session
        session = get_or_create_session(data['session_id'])
        
        # Create action record
        db = next(get_db())
        try:
            action = UserAction(
                session_id=session.id,
                action_type=data['action_type'],
                action_category=data['action_category'],
                element_id=data.get('element_id'),
                element_type=data.get('element_type'),
                element_text=data.get('element_text'),
                page_url=data.get('page_url'),
                action_data=data.get('action_data'),
                duration_ms=data.get('duration_ms'),
                success=data.get('success', 'true'),
                error_message=data.get('error_message')
            )
            
            db.add(action)
            db.commit()
            db.refresh(action)
            
            return jsonify({
                'success': True,
                'action_id': action.id,
                'timestamp': action.timestamp.isoformat()
            })
            
        finally:
            db.close()
            
    except Exception as e:
        return jsonify({'error': f'Failed to record action: {str(e)}'}), 500


@analytics_bp.route('/api/analytics/generation', methods=['POST'])
def record_generation():
    """Record a generation session (MWP to visual workflow)."""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['session_id', 'mwp_text']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Get or create session
        session = get_or_create_session(data['session_id'])
        
        # Create generation session
        db = next(get_db())
        try:
            generation = GenerationSession(
                user_session_id=session.id,
                mwp_text=data['mwp_text'],
                formula=data.get('formula'),
                hint=data.get('hint'),
                generated_dsl=data.get('generated_dsl'),
                dsl_validation_errors=data.get('dsl_validation_errors'),
                missing_svg_entities=data.get('missing_svg_entities'),
                success=data.get('success', 'pending'),
                error_message=data.get('error_message')
            )
            
            db.add(generation)
            db.commit()
            db.refresh(generation)
            
            return jsonify({
                'success': True,
                'generation_id': generation.id,
                'created_at': generation.created_at.isoformat()
            })
            
        finally:
            db.close()
            
    except Exception as e:
        return jsonify({'error': f'Failed to record generation: {str(e)}'}), 500


@analytics_bp.route('/api/analytics/generation/<generation_id>', methods=['PUT'])
def update_generation(generation_id: str):
    """Update a generation session with results."""
    try:
        data = request.get_json()
        
        db = next(get_db())
        try:
            generation = db.query(GenerationSession).filter(
                GenerationSession.id == generation_id
            ).first()
            
            if not generation:
                return jsonify({'error': 'Generation session not found'}), 404
            
            # Update fields
            if 'generated_dsl' in data:
                generation.generated_dsl = data['generated_dsl']
            if 'dsl_validation_errors' in data:
                generation.dsl_validation_errors = data['dsl_validation_errors']
            if 'missing_svg_entities' in data:
                generation.missing_svg_entities = data['missing_svg_entities']
            if 'success' in data:
                generation.success = data['success']
            if 'error_message' in data:
                generation.error_message = data['error_message']
            if 'generation_time_ms' in data:
                generation.generation_time_ms = data['generation_time_ms']
            if 'dsl_generation_time_ms' in data:
                generation.dsl_generation_time_ms = data['dsl_generation_time_ms']
            if 'visual_generation_time_ms' in data:
                generation.visual_generation_time_ms = data['visual_generation_time_ms']
            
            if data.get('success') in ['success', 'error']:
                generation.completed_at = datetime.utcnow()
            
            db.commit()
            
            return jsonify({
                'success': True,
                'generation_id': generation.id,
                'updated_at': generation.completed_at.isoformat() if generation.completed_at else None
            })
            
        finally:
            db.close()
            
    except Exception as e:
        return jsonify({'error': f'Failed to update generation: {str(e)}'}), 500


@analytics_bp.route('/api/analytics/stats', methods=['GET'])
def get_analytics_stats():
    """Get analytics statistics."""
    try:
        db = next(get_db())
        try:
            # Get time range from query params
            days = int(request.args.get('days', 7))
            start_date = datetime.utcnow() - timedelta(days=days)
            
            # Basic stats
            total_sessions = db.query(UserSession).filter(
                UserSession.created_at >= start_date
            ).count()
            
            total_actions = db.query(UserAction).filter(
                UserAction.timestamp >= start_date
            ).count()
            
            total_generations = db.query(GenerationSession).filter(
                GenerationSession.created_at >= start_date
            ).count()
            
            successful_generations = db.query(GenerationSession).filter(
                and_(
                    GenerationSession.created_at >= start_date,
                    GenerationSession.success == 'success'
                )
            ).count()
            
            # Action type breakdown
            action_breakdown = db.query(
                UserAction.action_type,
                func.count(UserAction.id).label('count')
            ).filter(
                UserAction.timestamp >= start_date
            ).group_by(UserAction.action_type).all()
            
            # Daily activity
            daily_activity = db.query(
                func.date(UserAction.timestamp).label('date'),
                func.count(UserAction.id).label('actions')
            ).filter(
                UserAction.timestamp >= start_date
            ).group_by(func.date(UserAction.timestamp)).all()
            
            return jsonify({
                'success': True,
                'stats': {
                    'period_days': days,
                    'total_sessions': total_sessions,
                    'total_actions': total_actions,
                    'total_generations': total_generations,
                    'successful_generations': successful_generations,
                    'success_rate': (successful_generations / total_generations * 100) if total_generations > 0 else 0,
                    'action_breakdown': [{'action_type': item.action_type, 'count': item.count} for item in action_breakdown],
                    'daily_activity': [{'date': item.date.isoformat(), 'actions': item.actions} for item in daily_activity]
                }
            })
            
        finally:
            db.close()
            
    except Exception as e:
        return jsonify({'error': f'Failed to get analytics: {str(e)}'}), 500


@analytics_bp.route('/api/analytics/actions', methods=['GET'])
def get_recent_actions():
    """Get recent user actions."""
    try:
        db = next(get_db())
        try:
            # Get query parameters
            limit = int(request.args.get('limit', 100))
            action_type = request.args.get('action_type')
            session_id = request.args.get('session_id')
            
            # Build query
            query = db.query(UserAction).order_by(desc(UserAction.timestamp))
            
            if action_type:
                query = query.filter(UserAction.action_type == action_type)
            
            if session_id:
                # Find session by session_id string
                session = db.query(UserSession).filter(UserSession.session_id == session_id).first()
                if session:
                    query = query.filter(UserAction.session_id == session.id)
            
            actions = query.limit(limit).all()
            
            return jsonify({
                'success': True,
                'actions': [{
                    'id': action.id,
                    'action_type': action.action_type,
                    'action_category': action.action_category,
                    'element_id': action.element_id,
                    'element_type': action.element_type,
                    'timestamp': action.timestamp.isoformat(),
                    'success': action.success,
                    'action_data': action.action_data
                } for action in actions]
            })
            
        finally:
            db.close()
            
    except Exception as e:
        return jsonify({'error': f'Failed to get actions: {str(e)}'}), 500
