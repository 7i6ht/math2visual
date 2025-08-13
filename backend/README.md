# Math2Visual Backend

A Flask-based backend service that transforms math word problems (MWPs) into visual representations using the Math2Visual framework. The system generates both formal and intuitive visual representations as SVG images.

## 🏗️ Architecture

The backend consists of the following key components:

- **API Routes**: RESTful endpoints for generation, uploads, and system management
- **Visual Generation**: Services for creating formal and intuitive SVG representations
- **Language Generation**: OpenAI-powered conversion of MWPs to visual language (DSL)
- **Storage Management**: Configurable storage backend (local/JuiceFS) for SVG datasets
- **Security**: Input validation, SVG sanitization, and optional ClamAV integration

## 📁 Project Structure

```
backend/
├── app/                         # Main application package
│   ├── __init__.py              # Flask application factory
│   ├── api/                     # API layer
│   │   ├── middleware/          # Error handlers and middleware
│   │   └── routes/              # API endpoints
│   │       ├── generation.py    # Core generation API
│   │       ├── upload.py        # SVG upload management
│   │       └── system.py        # System status endpoints
│   ├── config/                  # Configuration management
│   │   └── storage_config.py    # Storage backend configuration
│   ├── models/                  # Data models
│   ├── services/                # Business logic
│   │   ├── language_generation/ # GPT-based DSL generation
│   │   ├── validation/          # Input/output validation
│   │   └── visual_generation/   # SVG generation engines
│   └── utils/                   # Utility functions
├── app.py                       # Application entry point
├── storage/                     # Local storage directory
│   ├── datasets/svg_dataset/    # SVG entity library (1,548 files)
│   ├── models/                  # ML model checkpoints
│   └── output/                  # Generated visualizations
├── scripts/                     # Setup and management scripts
├── docs/                        # Documentation
└── tests/                       # Test suite
```

## 🚀 Quick Start

### Prerequisites

- Python 3.12+
- PostgreSQL 13+ (for JuiceFS mode)
- OpenAI API key
- Optional: ClamAV for security scanning

### Installation

1. **Clone and setup environment:**
```bash
cd backend/
pip install -r requirements.txt
```

2. **Configure environment variables:**
Update `.env` file with required environment variables.
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Storage Configuration
SVG_STORAGE_MODE=juicefs  # or 'local'
SVG_DATASET_PATH=/path/to/svg/dataset
SVG_CACHE_SIZE=100

# JuiceFS Configuration (if using JuiceFS)
JUICEFS_METADATA_URL=postgres://user:pass@localhost:5432/juicefs_metadata
```

3. **Set up JuiceFS:**
See [`docs/JUICEFS_SETUP.md`](docs/JUICEFS_SETUP.md) (or just add `SVG_STORAGE_MODE=local` to `.env` and continue).

4. **Run the application:**
```bash
python app.py
```

The server will start on `http://localhost:5001` by default.

## 📡 API Endpoints

### Core Generation API

#### `POST /api/generate`
Generate visual representations from math word problems.

**Request Body:**
```json
{
  "mwp": "Janet has 9 oranges and Sharon has 7 oranges. How many oranges do they have together?",
  "formula": "9 + 7 = 16"  // optional
}
```

**Alternative - Direct DSL:**
```json
{
  "dsl": "visual_language: addition(container1[entity_name: orange, entity_type: orange, entity_quantity: 9, container_name: Janet, container_type: girl], container2[entity_name: orange, entity_type: orange, entity_quantity: 7, container_name: Sharon, container_type: girl], result_container[entity_name: orange, entity_type: orange, entity_quantity: 16, container_name: Janet and Sharon, container_type: ])"
}
```

**Response:**
```json
{
  "visual_language": "addition(...)",
  "svg_formal": "<svg>...</svg>",      // Base64 or SVG content
  "svg_intuitive": "<svg>...</svg>",   // Base64 or SVG content
  "formal_error": null,
  "intuitive_error": null,
  "missing_svg_entities": ["entity1", "entity2"]
}
```

### SVG Upload API

#### `POST /api/upload-svg`
Upload SVG file to the svg_dataset directory with enhanced validation and security.

**Request Body (multipart/form-data):**
```
file: SVG file (required)
expected_filename: string (required) - Expected filename for validation
```

**Example using curl:**
```bash
curl -X POST http://localhost:5001/api/upload-svg \
  -F "file=@apple.svg" \
  -F "expected_filename=apple.svg"
```

**Response (Success - New file):**
```json
{
  "success": true,
  "message": "SVG file 'apple.svg' uploaded successfully",
  "file_hash": "a1b2c3d4e5f6g7h8",
  "validation_details": {
    "file_size": 2048,
    "svg_validation": "passed",
    "antivirus_scan": "clean",
    "file_hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
  }
}
```

**Response (Success - Duplicate file):**
```json
{
  "success": true,
  "message": "SVG file 'apple.svg' already exists with identical content"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "No file uploaded"
}
```

**Response (Validation Error):**
```json
{
  "success": false,
  "error": "Content validation failed: File contains potentially malicious content: <script[^>]*>",
  "validation_details": {
    "file_size": 2048,
    "content_valid": false,
    "file_hash": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
  }
}
```

### System Management (debug mode)

#### `GET /api/storage/status`
Get storage configuration and status information.

**Response (Success):**
```json
{
  "success": true,
  "storage": {
    "storage_mode": "local",
    "svg_dataset_path": "/path/to/svg_dataset",
    "is_valid": true,
    "svg_file_count": 1548,
    "sample_file_accessible": true
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Failed to get storage status: Permission denied"
}
```

#### `GET /api/antivirus/status`
Get antivirus scanner status and configuration information.

**Response (Success):**
```json
{
  "success": true,
  "antivirus": {
    "available": true,
    "daemon_running": true,
    "version": "ClamAV 0.103.8",
    "database_version": "26580",
    "last_update": "2024-01-15T10:30:00Z"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Failed to get antivirus status: ClamAV daemon not running"
}
```

## 🎨 Visual Generation

The system generates two types of visual representations:

### 1. Formal Representation
- Mathematical precision with exact quantities
- Explicit mathematical operations
- Accentuates underlying relationships in a clear mathematical way
- Grid-based layouts for structured display

### 2. Intuitive Representation  
- Detailed, example-driven illustration of mathematical relationships to reflect authentic real-world situations and narrative contexts
- Contextual groupings / arrangements
- Designed to improve engagement & reduce the cognitive load

Both generators support:
- **Dynamic SVG composition** from 1,548+ entity library
- **Intelligent layout calculation** based on content
- **Missing entity tracking** for dataset expansion
- **Error handling** with detailed feedback

## 🧠 Language Generation

The system uses OpenAI's GPT models to convert natural language math word problems into structured visual language (DSL).

### Visual Language Format
```
operation(
  container1[entity_name: apple, entity_type: apple, entity_quantity: 3, 
             container_name: John, container_type: boy],
  container2[entity_name: apple, entity_type: apple, entity_quantity: 5,
             container_name: Mary, container_type: girl],
  result_container[entity_name: apple, entity_type: apple, entity_quantity: 8,
                   container_name: John and Mary, container_type: ]
)
```

### Supported Operations
- `addition` - Adding quantities
- `subtraction` - Subtracting quantities  
- `multiplication` - Repeated addition/scaling
- `division` - Splitting into groups
- `comparison` - Comparing quantities
- `surplus` - Remainder operations
- `area` - Area calculations
- `unittrans` - Unit conversions

## 💾 Storage Configuration

### JuiceFS Distributed Storage (Default)
**Setup JuiceFS:**
See [`docs/JUICEFS_SETUP.md`](docs/JUICEFS_SETUP.md) for setup instructions.

```bash
SVG_STORAGE_MODE=juicefs
SVG_DATASET_PATH=/mnt/juicefs/svg_dataset
JUICEFS_METADATA_URL=postgres://user:pass@host:port/database
```

**Benefits:**
- Avoid file corruption in case two users upload SVG with same name at the same time

### Local Storage
Change mode to local in .env file:
```bash
SVG_STORAGE_MODE=local
```
- Uses `backend/storage/datasets/svg_dataset/` directory
- Simple filesystem access
- Suitable for development and single-node deployment

## 🔒 Security Features

### SVG Security
- SVG content validation and sanitization
- Removal of potentially malicious elements
- Size and complexity limits

### Optional ClamAV Integration
```bash
# Install ClamAV for virus scanning
sudo apt install clamav clamav-daemon
pip install pyclamd
```

See [`docs/CLAMAV_SETUP.md`](docs/CLAMAV_SETUP.md) for configuration details.

## 🧪 Testing

```bash
# Run test suite
python -m pytest tests/

# Test specific component
python -m pytest tests/test_svg_validator.py

# Test with coverage
python -m pytest --cov=app tests/
```

## 🛠️ Development

### Adding New SVG Entities
1. Create SVG file following naming conventions
2. Upload via `/api/upload-svg` endpoint
3. SVG will be validated and added to dataset

### Extending Visual Language
1. Update operation parsers in `services/visual_generation/`
2. Add new operation handlers
3. Update GPT prompts in `services/language_generation/`

### Custom Storage Backends
1. Extend `StorageConfig` class in `config/storage_config.py`
2. Implement new storage validation logic
3. Update environment configuration

## 📚 References

- [Math2Visual Paper](https://arxiv.org/pdf/2506.03735)
- [Math2Visual GitHub Repository](https://github.com/eth-lre/math2visual)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [JuiceFS Documentation](https://juicefs.com/docs/)

## 📄 License

This project is part of the Math2Visual research framework. Please refer to the main repository for licensing information.

---

For questions or support, please refer to the main [Math2Visual repository](https://github.com/eth-lre/math2visual) or open an issue in this project.
