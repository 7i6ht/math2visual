#!/usr/bin/env python3
"""
Setup script for Math2Visual analytics database.
This script creates the necessary database and tables for user action tracking.
"""
import os
import sys
import subprocess
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.config.database import create_database_engine, init_database, test_database_connection
from app.models.user_actions import Base
from sqlalchemy import create_engine, text


def create_postgres_database(database_url: str, db_name: str):
    """Create PostgreSQL database if it doesn't exist."""
    # Extract connection details from URL
    # Format: postgresql://user:password@host:port/database
    import re
    # For now, we'll assume the database exists or the user will create it
    # In a production setup, you'd want to handle database creation
    print(f"📊 Analytics database: {db_name}")
    print("   Please ensure the database exists and is accessible.")


def setup_analytics_database():
    """Setup the analytics database and tables."""
    print("🚀 Setting up Math2Visual Analytics Database...")
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL', 'sqlite:///./analytics.db')
    
    if database_url.startswith('postgresql://'):
        # Extract database name for PostgreSQL
        db_name = database_url.split('/')[-1]
        create_postgres_database(database_url, db_name)
    else:
        print(f"📊 Using SQLite database: {database_url}")
    
    # Test database connection
    print("🔍 Testing database connection...")
    if not test_database_connection():
        print("❌ Database connection failed!")
        print("   Please check your DATABASE_URL configuration.")
        return False
    
    # Initialize database tables
    print("📋 Creating database tables...")
    try:
        init_database()
        print("✅ Analytics database setup completed successfully!")
        return True
    except Exception as e:
        print(f"❌ Failed to setup database: {e}")
        return False


def main():
    """Main setup function."""
    print("=" * 60)
    print("Math2Visual Analytics Database Setup")
    print("=" * 60)
    
    # Check if we're in the right directory
    if not (backend_dir / "app").exists():
        print("❌ Please run this script from the backend directory")
        sys.exit(1)
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    # Setup database
    success = setup_analytics_database()
    
    if success:
        print("\n🎉 Analytics setup complete!")
        print("\nNext steps:")
        print("1. Start your Flask application: python app.py")
        print("2. User actions will be automatically tracked")
        print("3. View analytics at: /api/analytics/stats")
        print("4. For admin dashboard, integrate AnalyticsDashboard component")
    else:
        print("\n❌ Setup failed. Please check the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
