# Math2Visual Analytics Setup

This document describes how to set up and use the user action recording system in Math2Visual.

## 📊 Overview

The analytics system tracks user interactions and behaviors to provide insights into:
- Form usage and interaction patterns
- Cursor movements & screenhot for heat map analysis

## 🏗️ Architecture

### Backend Components
- **Database Models**: `UserSession`, `Action`, `Screenshot`, `CursorPosition` in SQLAlchemy
- **API Endpoints**: RESTful endpoints for recording and retrieving analytics data
- **Database**: PostgreSQL (recommended) or SQLite (development)
- **Storage**: File-based screenshot storage

### Frontend Components
- **Analytics Service**: Client-side service (`analyticsService`) for tracking user actions
- **useAnalytics Hook**: React hook providing analytics tracking functions
- **Automatic Tracking**: Batched action recording with debouncing

## 🚀 Quick Setup

### 1. PostgreSQL Database Configuration

```bash
# Create database
createdb math2visual_analytics

# Create user (optional)
psql -c "CREATE USER math2visual_user WITH PASSWORD 'your_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE math2visual_analytics TO math2visual_user;"
```

### 2. Environment Configuration

Copy the analytics template:
```bash
cp config_templates/env_analytics_template .env
```

Edit `.env` with your database configuration:
```bash
# For PostgreSQL
DATABASE_URL=postgresql://math2visual_user:your_password@localhost:5432/math2visual_analytics

# For SQLite (development)
DATABASE_URL=sqlite:///./analytics.db

# Database Configuration
DATABASE_ECHO=false  # Set to true for SQL query logging (development only)

# Analytics Configuration
ANALYTICS_ENABLED=true  # Set to false to disable user action tracking
ANALYTICS_RETENTION_DAYS=90  # How long to keep analytics data (days)
```

### 3. Database Initialization

The database is automatically initialized when the Flask app starts via `app/__init__.py`. The `init_database()` function creates all necessary tables:

```python
# In app/__init__.py
if test_database_connection():
    init_database()
    print("✅ Analytics database initialized")
```

Tables created:
- `user_sessions`: Session tracking
- `actions`: User action records
- `screenshots`: Screenshot metadata
- `cursor_positions`: Cursor tracking data

### 4. Frontend Configuration

Analytics are controlled by the `VITE_ENABLE_ANALYTICS` environment variable in the frontend.

Create or edit `frontend/.env`:
```bash
# Enable or disable analytics
VITE_ENABLE_ANALYTICS=true
```

### 5. Start the Application

```bash
# Backend
python app.py

# Frontend
cd frontend
npm install
npm run dev
```

The analytics system will automatically initialize when the Flask app starts.

## 📈 What Gets Tracked

### User Sessions
- **Session Creation**: Unique session IDs stored in localStorage
- **Session Activity**: Last activity timestamp updates
- **IP Address**: Optional IP tracking
- **User Agent**: Browser/device information

### User Actions (Tracked via `useAnalytics` hook)

#### Form Interactions
- `mwp_input_type`: Math word problem input typing
- `formula_input_type`: Formula input typing
- `hint_input_type`: Hint input typing
- `dsl_editor_type`: Visual language editor typing
- `math_problem_form_submit`: Math problem form submission
- `visual_language_form_change`: Visual language form changes

#### Navigation & Layout
- `initial_view_render`: Initial single-column view
- `two_column_layout_render`: Two-column editing view
- `dsl_editor_scroll_up/down`: DSL editor scrolling
- `math_problem_column_scroll_up/down`: Left column scrolling
- `visualization_column_scroll_up/down`: Right column scrolling

#### Popups & Modals
- `name_popup_open`: Name editor popup
- `entity_quantity_popup_open`: Quantity editor popup
- `name_popup_type`: Name popup typing
- `entity_quantity_popup_type`: Quantity popup typing
- `name_popup_button_submit`: Name popup button submit
- `name_popup_keyboard_submit`: Name popup keyboard submit

#### SVG Interactions
- `svg_element_hover`: SVG element hover
- `svg_element_click`: SVG element click
- `svg_search_popup_type`: SVG search typing
- `svg_upload_popup_type`: SVG upload popup typing

#### Downloads
- `download_svg_button_click`: SVG download
- `download_png_button_click`: PNG download
- `download_pdf_button_click`: PDF download

#### Generation
- `generation_start`: Generation initiation with MWP, formula, hint
- `generation_complete`: Generation completion with success/error status, DSL, missing entities

### Cursor Positions
- Mouse X/Y coordinates
- Element context (type, ID)
- Timestamp for heat map analysis

### Screenshots
- Full-page screenshots
- Timestamp and dimensions
- Stored in `backend/storage/screenshots/`

## 🔧 API Endpoints

### Sessions
```bash
# Create/update session
POST /api/analytics/session
{
  "session_id": "session_123"
}

Response:
{
  "success": true,
  "session_id": "session_123",
  "created_at": "2024-01-01T12:00:00Z",
  "last_activity": "2024-01-01T12:00:00Z"
}
```

### Actions
```bash
# Record batch actions
POST /api/analytics/actions/batch
{
  "session_id": "session_123",
  "actions": [
    {
      "type": "form_submit",
      "data": "{\"value\": \"some data\"}",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ]
}

Response:
{
  "success": true,
  "actions_recorded": 1,
  "message": "Successfully recorded 1 actions"
}
```

### Cursor Positions
```bash
# Record cursor positions
POST /api/analytics/cursor-positions/batch
{
  "session_id": "session_123",
  "positions": [
    {
      "x": 100.5,
      "y": 200.3,
      "element_type": "button",
      "element_id": "submit-btn",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Screenshots
```bash
# Upload screenshot
POST /api/analytics/screenshot
{
  "session_id": "session_123",
  "image_data": "data:image/png;base64,...",
  "width": 1920,
  "height": 1080,
  "timestamp": "2024-01-01T12:00:00Z"
}

Response:
{
  "success": true,
  "screenshot_id": "screenshot_123",
  "filename": "session_123_20240101_120000_abc12345.png",
  "created_at": "2024-01-01T12:00:00Z"
}
```

## 🔒 Privacy and Security

### Data Collection
- **No Personal Information**: Only technical interaction data
- **Session-Based**: Actions linked to anonymous session IDs
- **IP Addresses**: Stored for basic analytics (can be disabled)
- **User Agents**: For browser/device analytics
- **LocalStorage**: Session IDs stored client-side

### Data Retention
- **Configurable**: Set retention period via `ANALYTICS_RETENTION_DAYS` environment variable
- **Automatic Cleanup**: Can be implemented for automatic data purging
- **GDPR Compliant**: No personal data collection

### Security Measures
- **Input Validation**: All data is validated before storage
- **SQL Injection Protection**: SQLAlchemy ORM prevents injection
- **Base64 Validation**: Screenshot data validated before decoding
- **Rate Limiting**: Consider implementing rate limiting for API endpoints

## 📊 Analytics Insights

### User Behavior Patterns
- **Form Usage**: Which forms are used most frequently
- **Generation Success**: Success rates for different input types
- **Feature Adoption**: Which features are most/least used
- **Interaction Patterns**: Cursor heat maps and click patterns
- **Error Patterns**: Common failure points and error types

### Common Issues

#### Database Connection Failed
```bash
# Check database URL
echo $DATABASE_URL

# Test connection
python -c "from app.config.database import test_database_connection; test_database_connection()"
```

#### Tables Not Created
The database is automatically initialized when the Flask app starts. If tables are missing:

```python
# Manual initialization
from app.config.database import init_database
init_database()
```

#### Analytics Not Recording
1. Check `ANALYTICS_ENABLED=true` in environment
2. Check `VITE_ENABLE_ANALYTICS=true` in frontend
3. Verify database connection
4. Check browser console for errors
5. Verify session ID is being generated

### Debug Mode
```bash
# Enable SQL query logging
DATABASE_ECHO=true

# Check analytics service status in browser console
analyticsService.getSessionId()
analyticsService.isAnalyticsEnabled()
analyticsService.getQueueSize()
```

### Viewing Stored Data

#### Using PostgreSQL
```bash
# Connect to database
psql math2visual_analytics

# View sessions
SELECT * FROM user_sessions ORDER BY created_at DESC LIMIT 10;

# View actions
SELECT * FROM actions ORDER BY timestamp DESC LIMIT 10;

# View cursor positions
SELECT * FROM cursor_positions ORDER BY timestamp DESC LIMIT 10;

# View screenshots
SELECT * FROM screenshots ORDER BY created_at DESC LIMIT 10;
```

#### Using SQLite
```bash
# Connect to database
sqlite3 analytics.db

# Run the same queries as above
```

## 📚 Further Reading

- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [React Hooks Documentation](https://react.dev/reference/react)
- [navigator.sendBeacon API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon)
