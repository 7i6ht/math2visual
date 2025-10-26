"""
Analytics API routes for user action recording and analysis.
"""
from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import uuid
import os
import base64
import logging

from app.config.database import get_db
from app.models.user_actions import UserSession, Action, Screenshot, CursorPosition

analytics_bp = Blueprint('analytics', __name__)
logger = logging.getLogger(__name__)

# Configuration
SCREENSHOTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'storage', 'screenshots')

def ensure_dir_exists(directory: str) -> None:
    """Ensure a directory exists, creating it if necessary."""
    os.makedirs(directory, exist_ok=True)


def parse_timestamp(timestamp_str: Optional[str]) -> datetime:
    """Parse ISO timestamp string, falling back to current time."""
    if not timestamp_str:
        return datetime.utcnow()
    
    try:
        return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        logger.warning(f"Failed to parse timestamp: {timestamp_str}")
        return datetime.utcnow()


def decode_base64_image(image_data: str) -> bytes:
    """Decode base64 image data, handling data URI format."""
    try:
        # Handle data URI format: data:image/png;base64,...
        if ',' in image_data:
            _, encoded = image_data.split(',', 1)
            return base64.b64decode(encoded)
        else:
            return base64.b64decode(image_data)
    except Exception as e:
        raise ValueError(f'Invalid image data: {str(e)}')


def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> None:
    """Validate that required fields are present in data dictionary."""
    missing = [field for field in required_fields if field not in data]
    if missing:
        raise ValueError(f'Missing required fields: {", ".join(missing)}')


def create_error_response(message: str, status_code: int = 400) -> tuple:
    """Create a standardized error response."""
    return jsonify({'error': message}), status_code


def get_or_create_session(session_id: str, ip_address: Optional[str] = None, 
                         user_agent: Optional[str] = None) -> int:
    """Get existing session or create a new one. Returns the session database ID."""
    db = next(get_db())
    try:
        # Try to get existing session
        session = db.query(UserSession).filter(UserSession.session_id == session_id).first()
        
        if session:
            # Update last activity
            session.last_activity = datetime.utcnow()
            db.commit()
            return session.id
        
        # Create new session
        new_session = UserSession(
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        return new_session.id
        
    finally:
        db.close()


@analytics_bp.route('/api/analytics/session', methods=['POST'])
def create_session():
    """Create or update a user session."""
    try:
        data = request.get_json()
        validate_required_fields(data, ['session_id'])
        
        session_id = get_or_create_session(
            data['session_id'],
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        
        # Get the session details for response
        db = next(get_db())
        try:
            session = db.query(UserSession).filter(UserSession.id == session_id).first()
            if not session:
                return create_error_response('Session not found', 404)
            
            return jsonify({
                'success': True,
                'session_id': session.session_id,
                'created_at': session.created_at.isoformat(),
                'last_activity': session.last_activity.isoformat()
            })
        finally:
            db.close()
        
    except ValueError as e:
        return create_error_response(str(e), 400)
    except Exception as e:
        logger.error(f'Failed to create session: {str(e)}')
        return create_error_response('Failed to create session', 500)


def process_batch_items(items: List[Dict], item_validator, item_processor) -> List[Any]:
    """Generic batch processing for actions and cursor positions."""
    if not isinstance(items, list) or len(items) == 0:
        raise ValueError('items must be a non-empty array')
    
    results = []
    for idx, item_data in enumerate(items):
        if not isinstance(item_data, dict):
            raise ValueError(f'Item at index {idx} must be an object')
        
        item_validator(item_data, idx)
        results.append(item_processor(item_data))
    
    return results


def validate_action(action_data: Dict, idx: int) -> None:
    """Validate a single action item."""
    validate_required_fields(action_data, ['type'])


def process_action(action_data: Dict, session_id: int) -> Dict:
    """Process a single action item into database record."""
    return {
        'session_id': session_id,
        'type': action_data['type'],
        'data': action_data.get('data'),
        'timestamp': parse_timestamp(action_data.get('timestamp'))
    }


@analytics_bp.route('/api/analytics/actions/batch', methods=['POST'])
def record_actions_batch():
    """Record multiple actions in a single request."""
    try:
        data = request.get_json()
        validate_required_fields(data, ['session_id', 'actions'])
        
        session_id = get_or_create_session(data['session_id'])
        
        # Validate and process actions
        actions_to_create = process_batch_items(
            data['actions'],
            validate_action,
            lambda item: process_action(item, session_id)
        )
        
        # Bulk insert actions
        db = next(get_db())
        try:
            action_objects = [Action(**action_data) for action_data in actions_to_create]
            db.bulk_save_objects(action_objects)
            db.commit()
            
            return jsonify({
                'success': True,
                'actions_recorded': len(action_objects),
                'message': f'Successfully recorded {len(action_objects)} actions'
            })
            
        finally:
            db.close()
            
    except ValueError as e:
        return create_error_response(str(e), 400)
    except Exception as e:
        logger.error(f'Failed to record batch actions: {str(e)}')
        return create_error_response('Failed to record actions', 500)


def generate_screenshot_filename(session_id: str, timestamp: datetime) -> str:
    """Generate a unique filename for screenshot."""
    timestamp_str = timestamp.strftime('%Y%m%d_%H%M%S')
    screenshot_id = str(uuid.uuid4())[:8]
    return f"{session_id}_{timestamp_str}_{screenshot_id}.png"


@analytics_bp.route('/api/analytics/screenshot', methods=['POST'])
def upload_screenshot():
    """Upload a screenshot for a session."""
    try:
        data = request.get_json()
        validate_required_fields(data, ['session_id', 'image_data', 'width', 'height'])
        
        session_id = get_or_create_session(data['session_id'])
        
        # Parse timestamp
        screenshot_timestamp = parse_timestamp(data.get('timestamp'))
        
        # Decode image
        image_bytes = decode_base64_image(data['image_data'])
        
        # Ensure screenshots directory exists
        ensure_dir_exists(SCREENSHOTS_DIR)
        
        # Generate filename and save file
        filename = generate_screenshot_filename(data['session_id'], screenshot_timestamp)
        file_path = os.path.join(SCREENSHOTS_DIR, filename)
        
        with open(file_path, 'wb') as f:
            f.write(image_bytes)
        
        # Create database record
        db = next(get_db())
        try:
            screenshot = Screenshot(
                session_id=session_id,
                file_path=file_path,
                width=data['width'],
                height=data['height'],
                created_at=screenshot_timestamp
            )
            db.add(screenshot)
            db.commit()
            db.refresh(screenshot)
            
            return jsonify({
                'success': True,
                'screenshot_id': screenshot.id,
                'filename': filename,
                'created_at': screenshot.created_at.isoformat()
            })
            
        finally:
            db.close()
            
    except ValueError as e:
        return create_error_response(str(e), 400)
    except Exception as e:
        logger.error(f'Failed to upload screenshot: {str(e)}')
        return create_error_response('Failed to upload screenshot', 500)


def validate_cursor_position(pos_data: Dict, idx: int) -> None:
    """Validate a single cursor position item."""
    validate_required_fields(pos_data, ['x', 'y'])


def process_cursor_position(pos_data: Dict, session_id: int) -> Dict:
    """Process a single cursor position into database record."""
    return {
        'session_id': session_id,
        'x': float(pos_data['x']),
        'y': float(pos_data['y']),
        'element_type': pos_data.get('element_type'),
        'element_id': pos_data.get('element_id'),
        'timestamp': parse_timestamp(pos_data.get('timestamp'))
    }


@analytics_bp.route('/api/analytics/cursor-positions/batch', methods=['POST'])
def record_cursor_positions_batch():
    """Record multiple cursor positions in a single request."""
    try:
        data = request.get_json()
        validate_required_fields(data, ['session_id', 'positions'])
        
        session_id = get_or_create_session(data['session_id'])
        
        # Validate and process positions
        positions_to_create = process_batch_items(
            data['positions'],
            validate_cursor_position,
            lambda item: process_cursor_position(item, session_id)
        )
        
        # Bulk insert positions
        db = next(get_db())
        try:
            position_objects = [CursorPosition(**pos_data) for pos_data in positions_to_create]
            db.bulk_save_objects(position_objects)
            db.commit()
            
            return jsonify({
                'success': True,
                'positions_recorded': len(position_objects),
                'message': f'Successfully recorded {len(position_objects)} cursor positions'
            })
            
        finally:
            db.close()
            
    except ValueError as e:
        return create_error_response(str(e), 400)
    except Exception as e:
        logger.error(f'Failed to record cursor positions: {str(e)}')
        return create_error_response('Failed to record cursor positions', 500)
