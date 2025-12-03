"""
Flask application factory for Math2Visual backend.
"""
import os
from flask import Flask, send_from_directory
from flask_cors import CORS

from app.config.storage_config import validate_storage_config, storage_config
from app.config.database import init_database, test_database_connection
from app.api.routes.generation import generation_bp
from app.api.routes.system import system_bp
from app.api.routes.svg_dataset import svg_dataset_bp
from app.api.routes.analytics import analytics_bp
from app.api.middleware.error_handlers import register_error_handlers
from app.utils.translations import ensure_translation_models_installed


def create_app():
    """Create and configure the Flask application."""
    # Determine static folder path (for serving frontend in Docker)
    static_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static')
    static_folder = static_folder if os.path.exists(static_folder) else None
    
    app = Flask(__name__, static_folder=static_folder, static_url_path='')
    CORS(app)
    
    # Validate storage configuration on startup
    is_valid, error = validate_storage_config()
    if not is_valid:
        print(f"⚠️  Storage configuration issue: {error}")
        print(f"📍 Current storage info: {storage_config.get_storage_info()}")
    else:
        print(f"✅ Storage configured: {storage_config.storage_mode} mode")
        print(f"📁 SVG dataset path: {storage_config.svg_dataset_path}")
    
    # Initialize database
    if test_database_connection():
        init_database()
        print("✅ Analytics database initialized")
    else:
        print("⚠️  Analytics database not available - user tracking disabled")
    
    # Check and install translation models if missing
    ensure_translation_models_installed(auto_install=True)
    
    # Register blueprints
    app.register_blueprint(generation_bp)
    app.register_blueprint(system_bp)
    app.register_blueprint(svg_dataset_bp)
    app.register_blueprint(analytics_bp)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Serve frontend static files if they exist (for Docker deployment)
    if static_folder and os.path.exists(static_folder):
        @app.route('/', defaults={'path': ''}, methods=['GET'])
        @app.route('/<path:path>', methods=['GET'])
        def serve_frontend(path):
            """Serve frontend static files and handle client-side routing."""
            # Don't interfere with API routes - let Flask handle 404 for unmatched API routes
            if path.startswith('api'):
                from flask import abort
                abort(404)
            
            # Try to serve the requested file if it exists
            if path:
                file_path = os.path.join(static_folder, path)
                if os.path.exists(file_path) and os.path.isfile(file_path):
                    return send_from_directory(static_folder, path)
            
            # For client-side routing, serve index.html for all non-API routes
            return send_from_directory(static_folder, 'index.html')
        
        print(f"✅ Frontend static files configured: {static_folder}")
    
    return app
