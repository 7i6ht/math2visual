"""
Database configuration and connection management for Math2Visual.
"""
import os
from contextlib import contextmanager
from typing import Generator, Iterator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://localhost/math2visual_analytics')
ENGINE = None
SessionLocal = None


def get_database_url() -> str:
    """Get the database URL from environment variables."""
    return DATABASE_URL


def create_database_engine():
    """Create and configure the database engine."""
    global ENGINE, SessionLocal
    
    if ENGINE is None:
        database_url = get_database_url()
        
        # Configure engine with appropriate settings
        engine_kwargs = {
            'echo': os.getenv('DATABASE_ECHO', 'false').lower() == 'true',
            'pool_pre_ping': True,
            'pool_recycle': 300,  # Recycle connections every 5 minutes
        }
        
        # For SQLite (development), use different settings
        if database_url.startswith('sqlite'):
            engine_kwargs.update({
                'poolclass': StaticPool,
                'connect_args': {'check_same_thread': False}
            })
        
        ENGINE = create_engine(database_url, **engine_kwargs)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=ENGINE)
    
    return ENGINE


def get_db() -> Generator[Session, None, None]:
    """Dependency to get database session."""
    if SessionLocal is None:
        create_database_engine()
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def db_session() -> Iterator[Session]:
    """Context manager that wraps get_db() for safe session handling.

    This ensures the generator's cleanup logic is always executed exactly once.
    """
    db_generator = get_db()
    db = next(db_generator)
    try:
        yield db
    finally:
        db_generator.close()


def init_database():
    """Initialize the database with all tables."""
    from app.models.user_actions import Base
    
    engine = create_database_engine()
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")


def test_database_connection():
    """Test the database connection."""
    database_url = get_database_url()
    
    # If DATABASE_URL is empty or not set, analytics is disabled
    if not database_url or database_url.strip() == '':
        return False
    
    try:
        engine = create_database_engine()
        with engine.connect() as connection:
            result = connection.execute(text("SELECT 1"))
            result.fetchone()
        print("✅ Database connection successful")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
