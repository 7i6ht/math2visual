"""
Main application entry point for Math2Visual backend.
This file uses the new organized structure with Flask application factory pattern.
"""
from app import create_app

# Create Flask app using application factory
app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
