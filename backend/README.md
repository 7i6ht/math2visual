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
├── app/                                    # Main application package
│   ├── __init__.py                         # Flask application factory
│   ├── api/                                # API layer
│   │   ├── middleware/                     # Error handlers and middleware
│   │   │   ├── __init__.py
│   │   │   └── error_handlers.py
│   │   ├── routes/                         # API endpoints
│   │   │   ├── __init__.py
│   │   │   ├── analytics.py                # Analytics and usage tracking
│   │   │   ├── generation.py               # Core generation API
│   │   │   ├── svg_dataset.py              # SVG dataset management (upload, search, serve)
│   │   │   └── system.py                   # System status endpoints
│   │   └── __init__.py
│   ├── config/                             # Configuration management
│   │   ├── __init__.py
│   │   ├── database.py                     # Database configuration
│   │   └── storage_config.py               # Storage backend configuration
│   ├── models/                             # Data models
│   │   ├── __init__.py
│   │   └── user_actions.py                 # User action tracking models
│   ├── services/                           # Business logic
│   │   ├── language_generation/            # GPT-based DSL generation
│   │   │   ├── __init__.py
│   │   │   ├── gpt_generator.py
│   │   │   └── model_generator.py
│   │   ├── validation/                     # Input/output validation
│   │   │   ├── __init__.py
│   │   │   ├── security_scanner.py         # ClamAV integration
│   │   │   └── svg_validator.py
│   │   ├── visual_generation/              # SVG generation engines
│   │   │   ├── __init__.py
│   │   │   ├── dsl_parser.py
│   │   │   ├── formal_generator.py
│   │   │   └── intuitive_generator.py
│   │   └── __init__.py
│   ├── storage/                            # Application storage
│   │   ├── datasets/                       # Dataset files
│   │   ├── models/                         # ML model files
│   │   ├── output/                         # Generated outputs
│   │   └── analytics/                      # Analytics data storage (screenshots, etc.)
│   └── utils/                              # Utility functions
│       ├── __init__.py
│       ├── cleanup.py
│       └── validation_constants.py
├── app.py                                  # Application entry point
├── gunicorn.conf.py                        # Gunicorn WSGI server configuration
├── math2visual.yml                         # Conda environment file
├── requirements.txt                        # Python dependencies
├── storage/                                # Local storage directory
│   ├── datasets/svg_dataset/               # SVG entity library (1,549 files)
│   ├── models/                             # ML model checkpoints
│   │   ├── base_model/                     # Base language models
│   │   └── check-point/                    # Fine-tuned adapters
│   ├── output/                             # Generated visualizations
│   └── analytics/                          # Analytics data storage
│       ├── *.png                           # User session screenshots
│       └── heatmaps/                       # Generated heatmap visualizations
├── scripts/                                # Setup and management scripts
│   ├── cleanup_temp_files.py               # File cleanup utility
│   ├── format_juicefs.sh                   # JuiceFS formatting script
│   ├── generate_heatmap.py                 # Heatmap generation from cursor analytics
│   ├── install_juicefs.sh                  # JuiceFS installation
│   ├── install_systemd_service.sh          # Systemd service installation
│   ├── juicefs-math2visual.service.template # Systemd service template
│   ├── mount_juicefs.sh                    # JuiceFS mounting
│   ├── start_production.sh                 # Production deployment script
│   ├── uninstall_systemd_service.sh        # Systemd service uninstallation
│   └── verify_juicefs.sh                   # JuiceFS verification
├── docs/                                   # Documentation
│   ├── PRODUCTION_DEPLOYMENT.md            # Production deployment guide
│   ├── JUICEFS_SETUP.md                    # JuiceFS setup instructions
│   ├── CLAMAV_SETUP.md                     # ClamAV antivirus setup
│   └── cleanup_setup.md                    # File cleanup documentation
├── config_templates/                       # Configuration templates
│   └── env_juicefs_template                # JuiceFS environment template
└── tests/                                  # Test suite
    └── test_svg_validator.py
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

# Option 1: Using conda (recommended - requirements.txt is a conda environment file)
conda create --name math2visual --file requirements.txt

# Option 2: Using pip (install individual packages)
pip install flask flask-cors python-dotenv openai torch transformers peft accelerate bitsandbytes safetensors gunicorn
```

2. **Configure environment variables:**
Update `.env` file with required environment variables.
```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Storage Configuration
SVG_STORAGE_MODE=local  # or 'juicefs'
SVG_DATASET_PATH=/path/to/svg/dataset
SVG_CACHE_SIZE=100

# JuiceFS Configuration (only if using JuiceFS)
See [`docs/JUICEFS_SETUP.md`](docs/JUICEFS_SETUP.md)

3. **Run the application:**

**Development mode:**
```bash
python app.py
```

**Production mode:**
```bash
# Using the production script (recommended)
./scripts/start_production.sh

# Or directly with Gunicorn
gunicorn --config gunicorn.conf.py app:app
```

The server will start on `http://localhost:5000` by default.

### Production Deployment

For production deployment, see the comprehensive guide: [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md)

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

### SVG Dataset Management API

#### `POST /api/svg-dataset/upload`
Upload SVG file to the svg_dataset directory with validation and security scanning.

**Request Body (multipart/form-data):**
```
file: SVG file (required)
expected_filename: string (required) - Expected filename for validation
```

**Example using curl:**
```bash
curl -X POST http://localhost:5000/api/svg-dataset/upload \
  -F "file=@apple.svg" \
  -F "expected_filename=apple.svg"
```

**Response (Success - New file):**
```json
{
  "success": true,
  "message": "SVG file 'apple.svg' uploaded successfully",
  "validation_details": {
    "filename_valid": true,
    "size_valid": true,
    "type_valid": true,
    "content_valid": true,
    "antivirus_scan": {
      "antivirus_available": true,
      "scan_performed": true,
      "scanner_error": null,
      "threat_found": null
    }
  }
}
```

**Response (Error - File already exists):**
```json
{
  "success": false,
  "error": "File 'apple.svg' already exists or has been added by another user in the meantime"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "No file uploaded"
}
```

#### `GET /api/svg-dataset/search`
Search SVG files in the dataset by name.

**Query Parameters:**
- `query`: Search string to match against SVG filenames (optional)
- `limit`: Maximum number of results (default: 10, max: 50)

**Response:**
```json
{
  "files": [
    {
      "filename": "apple.svg",
      "name": "apple",
      "path": "/path/to/svg_dataset/apple.svg"
    }
  ],
  "query": "apple"
}
```

#### `GET /api/svg-dataset/check-exists`
Check if an SVG name already exists in the dataset.

**Query Parameters:**
- `name`: SVG name to check (without extension)

**Response:**
```json
{
  "exists": true,
  "name": "apple"
}
```

#### `GET /api/svg-dataset/files/<filename>`
Serve SVG files from the dataset.

**Parameters:**
- `filename`: The SVG filename to serve

**Response:** SVG file content with appropriate headers

### Validation Error Responses

**Response (Content validation error - Malicious content detected):**
```json
{
  "success": false,
  "error": "Content validation failed: File contains potentially malicious content: <script[^>]*>",
  "validation_details": {
    "filename_valid": true,
    "size_valid": true,
    "type_valid": true,
    "content_valid": false,
    "antivirus_scan": null
  }
}
```

**Response (Filename validation error):**
```json
{
  "success": false,
  "error": "Filename validation failed: File must have .svg extension",
  "validation_details": {
    "filename_valid": false,
    "size_valid": false,
    "type_valid": false,
    "content_valid": false,
    "antivirus_scan": null
  }
}
```

**Response (File size validation error):**
```json
{
  "success": false,
  "error": "File too large (max 5MB)",
  "validation_details": {
    "filename_valid": true,
    "size_valid": false,
    "type_valid": false,
    "content_valid": false,
    "antivirus_scan": null
  }
}
```

#### Validation Details Fields

- **`filename_valid`**: Checks for `.svg` extension and safe filename characters
- **`size_valid`**: Verifies file size is under the 5MB limit
- **`type_valid`**: Validates SVG MIME type and basic structure  
- **`content_valid`**: Scans for malicious patterns (scripts, external references, etc.)
- **`antivirus_scan`**: ClamAV scanning results when antivirus is available:
  - `antivirus_available`: Whether ClamAV daemon is running
  - `scan_performed`: Whether the scan was successfully executed  
  - `scanner_error`: Any error message from the scanner
  - `threat_found`: Specific threat name if malware detected

#### Antivirus Scanning Scenarios

**ClamAV Available and Clean:**
```json
"antivirus_scan": {
  "antivirus_available": true,
  "scan_performed": true,
  "scanner_error": null,
  "threat_found": null
}
```

**ClamAV Not Available:**
```json
"antivirus_scan": {
  "antivirus_available": false,
  "scan_performed": false,
  "scanner_error": "ClamAV daemon not running",
  "threat_found": null
}
```

**Threat Detected:**
```json
"antivirus_scan": {
  "antivirus_available": true,
  "scan_performed": true,
  "scanner_error": null,
  "threat_found": "Trojan.SVG.Malware"
}
```

### System Management (debug mode)

#### `GET /api/storage/status`
Get storage configuration and status information.

**Response (Success):**
```json
{
  "storage": {
    "cache_size": 100,
    "error": null,
    "is_juicefs_enabled": true,
    "is_valid": true,
    "juicefs_mounted": true,
    "sample_file_accessible": true,
    "storage_mode": "juicefs",
    "svg_dataset_path": "/mnt/juicefs/svg_dataset",
    "svg_file_count": 1550,
    "upload_path": "/mnt/juicefs/svg_dataset"
  },
  "success": true
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
    "antivirus": {
      "clamav_version": "ClamAV 1.0.7/27730/Tue Aug 12 10:33:28 2025",
      "connection_method": "socket",
      "connection_target": "/var/run/clamav/clamd.ctl",
      "pyclamd_installed": true,
      "scanner_available": true,
      "scanner_module_available": true
    },
    "success": true
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
- **Dynamic SVG composition** from 1,549+ entity library
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

### Local Storage (Default)
Change mode to local in .env file:
```bash
SVG_STORAGE_MODE=local
```
- Uses `backend/storage/datasets/svg_dataset/` directory
- Simple filesystem access
- Suitable for development and single-node deployment

### JuiceFS Distributed Storage
**Setup JuiceFS:**
See [`docs/JUICEFS_SETUP.md`](docs/JUICEFS_SETUP.md) for setup instructions.

```bash
SVG_STORAGE_MODE=juicefs
SVG_DATASET_PATH=/mnt/juicefs/svg_dataset
JUICEFS_METADATA_URL=postgres://user:pass@host:port/database
```

**Benefits:**
- **Scalability**: Easy to add distributed storage later
- **Backup**: PostgreSQL metadata can be backed up normally

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

Additional documentation:
- [`docs/cleanup_setup.md`](docs/cleanup_setup.md) - Cleanup and maintenance setup

## 📊 Analytics

The backend includes user analytics tracking.

For detailed setup instructions, API documentation, and usage examples, see:
**[`docs/ANALYTICS_SETUP.md`](docs/ANALYTICS_SETUP.md)**

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
2. Check if name exists via `/api/svg-dataset/check-exists` endpoint
3. Upload via `/api/svg-dataset/upload` endpoint
4. SVG will be validated and added to dataset
5. Use `/api/svg-dataset/search` to find and manage existing entities

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
