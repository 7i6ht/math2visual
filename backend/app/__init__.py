"""
Flask application factory for Math2Visual backend.
"""
from flask import Flask
from flask_cors import CORS

from app.config.storage_config import validate_storage_config, storage_config
from app.api.routes.generation import generation_bp
from app.api.routes.upload import upload_bp  
from app.api.routes.system import system_bp
from app.api.middleware.error_handlers import register_error_handlers


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    CORS(app)
    
    # Validate storage configuration on startup
    is_valid, error = validate_storage_config()
    if not is_valid:
        print(f"⚠️  Storage configuration issue: {error}")
        print(f"📍 Current storage info: {storage_config.get_storage_info()}")
    else:
        print(f"✅ Storage configured: {storage_config.storage_mode} mode")
        print(f"📁 SVG dataset path: {storage_config.svg_dataset_path}")
    
    # Register blueprints
    app.register_blueprint(generation_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(system_bp)
    
    # Register error handlers
    register_error_handlers(app)
    
    return app
