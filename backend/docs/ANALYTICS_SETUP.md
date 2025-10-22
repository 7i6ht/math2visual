# Math2Visual Analytics Setup

This document describes how to set up and use the user action recording system in Math2Visual.

## 📊 Overview

The analytics system tracks user interactions and generation workflows to provide insights into:
- User behavior patterns
- Generation success rates
- Feature usage statistics
- Error tracking and debugging
- Performance metrics

## 🏗️ Architecture

### Backend Components
- **Database Models**: User sessions, actions, and generation workflows
- **API Endpoints**: RESTful endpoints for recording and retrieving analytics data
- **Database**: PostgreSQL (recommended) or SQLite (development)

### Frontend Components
- **Analytics Service**: Client-side service for tracking user actions
- **Integration**: Automatic tracking in forms, downloads, and interactions
- **Admin Dashboard**: Component for viewing analytics data

## 🚀 Quick Setup

### 1. Database Configuration

#### Option A: PostgreSQL (Recommended)
```bash
# Create database
createdb math2visual_analytics

# Create user (optional)
psql -c "CREATE USER math2visual_user WITH PASSWORD 'your_password';"
psql -c "GRANT ALL PRIVILEGES ON DATABASE math2visual_analytics TO math2visual_user;"
```

#### Option B: SQLite (Development)
```bash
# No setup required - database will be created automatically
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

# Analytics settings
ANALYTICS_ENABLED=true
ANALYTICS_RETENTION_DAYS=90
```

### 3. Install Dependencies

```bash
# Install new dependencies
pip install sqlalchemy psycopg2-binary

# Or update your conda environment
conda env update --file requirements.txt
```

### 4. Initialize Database

```bash
# Run the setup script
python scripts/setup_analytics_db.py
```

### 5. Start the Application

```bash
python app.py
```

The analytics system will automatically initialize when the Flask app starts.

## 📈 What Gets Tracked

### User Sessions
- Session creation and activity
- IP address and user agent
- Session duration

### User Actions
- **Form Submissions**: Math problem and visual language forms
- **Element Interactions**: Button clicks, input changes
- **Downloads**: SVG, PNG, PDF downloads
- **Uploads**: SVG file uploads
- **Navigation**: Page/view changes
- **Errors**: Generation failures, validation errors

### Generation Workflows
- **Math Problem Input**: Original MWP, formula, hint
- **Generated DSL**: Visual language output
- **Validation Results**: Parsing errors, missing entities
- **Visual Output**: Success/failure of formal and intuitive generation
- **Timing**: Generation duration, DSL processing time

## 🔧 API Endpoints

### Recording Actions
```bash
# Create/update session
POST /api/analytics/session
{
  "session_id": "session_123"
}

# Record action
POST /api/analytics/action
{
  "session_id": "session_123",
  "action_type": "form_submit",
  "action_category": "generation",
  "element_type": "form",
  "action_data": {...}
}

# Record generation workflow
POST /api/analytics/generation
{
  "session_id": "session_123",
  "mwp_text": "John has 5 apples...",
  "formula": "5 + 3 = 8",
  "hint": "Add the numbers"
}
```

### Viewing Analytics
```bash
# Get statistics
GET /api/analytics/stats?days=7

# Get recent actions
GET /api/analytics/actions?limit=100

# Get actions by type
GET /api/analytics/actions?action_type=form_submit
```

## 🎛️ Admin Dashboard

### Frontend Integration

Add the analytics dashboard to your admin interface:

```tsx
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';

// In your admin route
<AnalyticsDashboard />
```

### Key Metrics Displayed
- **Total Sessions**: Unique user sessions
- **Total Actions**: All user interactions
- **Generation Success Rate**: Percentage of successful generations
- **Action Breakdown**: Actions by type (form_submit, download, etc.)
- **Daily Activity**: Actions per day
- **Recent Actions**: Latest user interactions

## 🔒 Privacy and Security

### Data Collection
- **No Personal Information**: Only technical interaction data
- **Session-Based**: Actions linked to anonymous session IDs
- **IP Addresses**: Stored for basic analytics (can be disabled)
- **User Agents**: For browser/device analytics

### Data Retention
- **Configurable**: Set retention period in environment variables
- **Automatic Cleanup**: Old data can be automatically purged
- **GDPR Compliant**: No personal data collection

### Security Measures
- **Input Validation**: All data is validated before storage
- **SQL Injection Protection**: SQLAlchemy ORM prevents injection
- **Rate Limiting**: Consider implementing rate limiting for API endpoints

## 📊 Analytics Insights

### User Behavior Patterns
- **Form Usage**: Which forms are used most frequently
- **Generation Success**: Success rates for different input types
- **Feature Adoption**: Which features are most/least used
- **Error Patterns**: Common failure points and error types

### Performance Metrics
- **Generation Times**: How long generations take
- **Success Rates**: Overall and per-feature success rates
- **User Engagement**: Session duration and action frequency

### Debugging Information
- **Error Tracking**: Detailed error messages and contexts
- **Missing Entities**: Which SVG entities are most commonly missing
- **Validation Issues**: DSL parsing problems and patterns

## 🛠️ Customization

### Adding New Action Types
```typescript
// In your component
analyticsService.recordAction({
  action_type: 'custom_action',
  action_category: 'custom',
  element_type: 'custom_element',
  action_data: { custom: 'data' }
});
```

### Custom Analytics Queries
```python
# In your backend
from app.config.database import get_db
from app.models.user_actions import UserAction

# Custom query example
db = next(get_db())
custom_actions = db.query(UserAction).filter(
    UserAction.action_type == 'custom_action'
).all()
```

### Disabling Analytics
```bash
# In .env file
ANALYTICS_ENABLED=false
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check database URL
echo $DATABASE_URL

# Test connection manually
python -c "from app.config.database import test_database_connection; test_database_connection()"
```

#### Tables Not Created
```bash
# Run setup script
python scripts/setup_analytics_db.py

# Or manually initialize
python -c "from app.config.database import init_database; init_database()"
```

#### Analytics Not Recording
- Check `ANALYTICS_ENABLED=true` in environment
- Verify database connection
- Check browser console for errors
- Ensure session ID is being generated

### Debug Mode
```bash
# Enable SQL query logging
DATABASE_ECHO=true

# Check analytics service status
# In browser console: analyticsService.isAnalyticsEnabled()
```

## 📚 Further Reading

- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Flask Analytics Best Practices](https://flask.palletsprojects.com/en/2.3.x/patterns/)
- [React Analytics Integration](https://reactjs.org/docs/thinking-in-react.html)
